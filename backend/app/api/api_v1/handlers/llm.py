from fastapi import APIRouter, HTTPException, Depends, File, Body, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import pandas as pd
import httpx
import json
import tempfile
import time
from pprint import pprint  # optional, for nicer formatting
from app.schemas.llm_schemas import AskFileRequest
import os

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_community.utilities import SerpAPIWrapper
from langchain_community.document_loaders import CSVLoader
from langchain_core.runnables import Runnable
from langchain_community.callbacks import get_openai_callback

from app.models.user_model import User
from app.api.deps.user_deps import get_current_user
from app.core.db_setup import get_db
from app.services.data_service import DataService
from app.models.user_data_model import FileType
from app.models.file_qa_model import FileQA, GPTModelType
from app.services.usage_service import UsageService

from app.lists.synthethic_categories import extract_field_names
from app.schemas.llm_schemas import PromptInput
from app.core.config import settings

import tiktoken
from app.utils.http_exceptions import (
    not_found_error,
    bad_request_error,
    forbidden_error,
    internal_server_error,
    unauthorized_error,
    validation_error,
    conflict_error,
    too_many_requests_error,
)

llm_router = APIRouter()

# LLM configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "phi3"

# Available OpenAI models with active status for MVP
AVAILABLE_MODELS = [
    # Active for MVP
    {
        "id": "gpt-3.5-turbo",
        "name": "GPT-3.5 Turbo",
        "description": "Fast and efficient",
        "active": True,
    },
    # Economy models - deactivated for MVP
    {
        "id": "gpt-4o-mini",
        "name": "GPT-4o Mini",
        "description": "Cost-effective GPT-4o variant",
        "active": False,
    },
    {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "description": "Optimized for speed and efficiency",
        "active": False,
    },
    # Advanced models - deactivated for MVP
    {
        "id": "gpt-4",
        "name": "GPT-4",
        "description": "Most capable model",
        "active": False,
    },
    {
        "id": "gpt-4-turbo",
        "name": "GPT-4 Turbo",
        "description": "Latest and most advanced",
        "active": False,
    },
    {
        "id": "gpt-4.1",
        "name": "GPT-4.1",
        "description": "Enhanced coding capabilities",
        "active": False,
    },
    {
        "id": "gpt-4.1-mini",
        "name": "GPT-4.1 Mini",
        "description": "Faster coding model",
        "active": False,
    },
    # Reasoning models - deactivated for MVP
    {
        "id": "o1-preview",
        "name": "o1-preview",
        "description": "Advanced reasoning model",
        "active": False,
    },
    {
        "id": "o1-mini",
        "name": "o1-mini",
        "description": "Cost-effective reasoning",
        "active": False,
    },
]


def validate_model_availability(model_id: str) -> bool:
    """
    Validate if a model is available and active for MVP.
    Returns True if model is available and active, False otherwise.
    """
    model = next((m for m in AVAILABLE_MODELS if m["id"] == model_id), None)
    return model is not None and model["active"]


def get_available_models() -> List[dict]:
    """
    Get list of all available models with their status.
    """
    return AVAILABLE_MODELS


def get_active_models() -> List[dict]:
    """
    Get list of only active models for MVP.
    """
    return [model for model in AVAILABLE_MODELS if model["active"]]


@llm_router.get("/models")
async def get_available_models_endpoint():
    """
    Get list of all available models with their active status.
    Frontend can use this to display available models and their status.
    """
    return {"models": get_available_models(), "active_models": get_active_models()}


# @llm_router.post("/chat")
# async def chat_with_phi3(
#     input: PromptInput,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     """
#     Send a prompt to the LLM and get a response.
#     """
#     # Estimate token usage (rough approximation)
#     estimated_tokens = len(input.prompt.split()) * 1.3  # Rough estimation

#     # Check usage limits before processing
#     if not UsageService.check_usage_limit(db, str(current_user.id), "openai_tokens", estimated_tokens):
#         raise bad_request_error(
#             error_code="QUOTA_EXCEEDED",
#             message="AI token limit exceeded. This request would exceed your plan's monthly token limit. Please upgrade your plan or purchase additional tokens.",
#             extra={
#                 "estimated_tokens": estimated_tokens,
#                 "limit_type": "openai_tokens"
#             }
#         )

#     payload = {"model": MODEL_NAME, "prompt": input.prompt, "stream": False}

#     # Increase timeout and use connection pooling for better performance
#     async with httpx.AsyncClient(
#         timeout=60.0,
#         limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
#     ) as client:
#         try:
#             response = await client.post(OLLAMA_URL, json=payload, timeout=60.0)
#             data = response.json()

#             # Track actual token usage after successful response
#             actual_tokens = len(input.prompt.split()) + len(data.get("response", "").split())
#             UsageService.track_usage(
#                 db=db,
#                 user_id=str(current_user.id),
#                 feature="openai_tokens",
#                 amount=actual_tokens,
#                 description="LLM chat request"
#             )

#             # Parse and format the response for better readability
#             try:
#                 # Check if the response is a valid JSON string
#                 import json

#                 response_text = data["response"]
#                 parsed_json = json.loads(response_text)
#                 return JSONResponse(content=parsed_json, status_code=200)
#             except json.JSONDecodeError:
#                 # If not valid JSON, return as is
#                 return {"response": data["response"]}
#         except httpx.TimeoutException:
#             raise internal_server_error(
#                 message="Model response timed out. The request may be too complex or the model service may be unavailable.",
#                 extra={"error_type": "timeout", "model": MODEL_NAME}
#             )


# @llm_router.post("/chat/csvs/{file_id}/columns_mapping")
# async def chat_with_phi3_columns_mapping(
#     file_id: str,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     """
#     Analyze a CSV file and map its columns to predefined fields using the LLM.
#     """
#     # Check against all_fields
#     all_fields = extract_field_names()

#     # Retrieve the UserCSV record
#     user_csv = await DataService.get_data_by_ids(
#         user_id=current_user.id, file_id=file_id, db=db
#     )

#     df = pd.read_csv(user_csv.csv_file_path)
#     first_10_rows = df.head(10)

#     if not user_csv:
#         raise not_found_error(
#             message="CSV file not found",
#             extra={"file_id": file_id}
#         )

#     # prompt = f"Give us the name of columns of this csv data: {first_10_rows}"
#     prompt = f"Look at the data of each column of this csv data: {first_10_rows} and look at the list of fields: {all_fields}, please map each csv column to nearest corresponding field. only return the name of the columns and corresponding fields, no other text."
#     # prompt = f"Given the first 10 rows of the CSV file with the following columns: {first_10_rows}, please map each csv column to the corresponding field from the following list: {all_fields}. If a column does not correspond to any field, indicate that it does not exist. Please return the mapping in JSON format."

#     # Estimate token usage
#     estimated_tokens = len(prompt.split()) * 1.3

#     # Check usage limits before processing
#     if not UsageService.check_usage_limit(db, str(current_user.id), "openai_tokens", estimated_tokens):
#         raise bad_request_error(
#             error_code="QUOTA_EXCEEDED",
#             message="AI token limit exceeded. This request would exceed your plan's monthly token limit. Please upgrade your plan or purchase additional tokens.",
#             extra={
#                 "estimated_tokens": estimated_tokens,
#                 "limit_type": "openai_tokens"
#             }
#         )

#     payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}

#     # Increase timeout and use connection pooling for better performance
#     async with httpx.AsyncClient(
#         timeout=300.0,
#         limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
#     ) as client:
#         try:
#             response = await client.post(OLLAMA_URL, json=payload, timeout=300.0)
#             data = response.json()

#             # Track actual token usage after successful response
#             actual_tokens = len(prompt.split()) + len(data.get("response", "").split())
#             UsageService.track_usage(
#                 db=db,
#                 user_id=str(current_user.id),
#                 feature="openai_tokens",
#                 amount=actual_tokens,
#                 description=f"CSV columns mapping for file {file_id}"
#             )

#             # Parse and format the response for better readability
#             try:
#                 # Check if the response is a valid JSON string
#                 import json

#                 response_text = data["response"]
#                 parsed_json = json.loads(response_text)
#                 return JSONResponse(content=parsed_json, status_code=200)
#             except json.JSONDecodeError:
#                 # If not valid JSON, return as is
#                 return {"response": data["response"]}
#         except httpx.TimeoutException:
#             raise internal_server_error(
#                 message="Model response timed out. The request may be too complex or the model service may be unavailable.",
#                 extra={"error_type": "timeout", "model": MODEL_NAME}
#             )


@llm_router.post("/ask-file")
async def ask_file(
    request: AskFileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process a file and ask a question using OpenAI and LangChain components.

    Available models are configured with MVP restrictions.
    Only active models are allowed during MVP phase.
    """
    start_time = time.time()
    user_file = None  # Initialize to avoid UnboundLocalError
    temp_file = None  # Initialize to avoid UnboundLocalError

    # 1. Check AI prompt count limit (before processing)
    if not UsageService.check_usage_limit(db, str(current_user.id), "ai_prompts", 1):
        # Get current usage to show user helpful info
        usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
        current_usage = usage_summary.current_month.get("ai_prompts", 0)
        limit = usage_summary.limits.get("ai_prompts", 0)

        raise bad_request_error(
            error_code="QUOTA_EXCEEDED",
            message=f"AI prompt limit exceeded. You have used {int(current_usage)} of {int(limit)} prompts this month. Please upgrade your plan or wait until next month to reset your limit.",
            extra={
                "limit_type": "ai_prompts",
                "requested_amount": 1,
                "current_usage": int(current_usage),
                "monthly_limit": int(limit),
                "remaining": 0,
            },
        )

    # Validate model availability and active status
    if not validate_model_availability(request.model):
        # Check if model exists but is not active
        model_exists = any(m["id"] == request.model for m in AVAILABLE_MODELS)
        if model_exists:
            raise bad_request_error(
                error_code="MODEL_NOT_AVAILABLE_MVP",
                message=f"Model '{request.model}' is not available during MVP phase. Only active models are allowed.",
                extra={"requested_model": request.model, "phase": "MVP"},
            )
        else:
            # Model doesn't exist at all
            active_models = [m["id"] for m in get_active_models()]
            raise bad_request_error(
                error_code="INVALID_MODEL",
                message=f"Invalid model '{request.model}'. Available models for MVP are: {', '.join(active_models)}",
                extra={
                    "requested_model": request.model,
                    "available_models": active_models,
                },
            )

    # Get the file data
    user_file = await DataService.get_data_by_ids(
        user_id=current_user.id, file_id=request.file_id, db=db
    )
    if not user_file:
        raise not_found_error(
            message="File not found", extra={"file_id": request.file_id}
        )

    # Get previous Q&A history for this file (using same logic as get_qa_history endpoint)
    qa_history_query = db.query(FileQA).filter(
        FileQA.user_id == current_user.id,
        FileQA.file_id == request.file_id,
        FileQA.error_message.is_(None),  # Only successful interactions
    )

    # Get last 5 Q&A pairs for context
    previous_qa = qa_history_query.order_by(desc(FileQA.created_at)).limit(5).all()

    # Load DataFrame based on file type
    try:
        if user_file.file_type == FileType.CSV:
            df = pd.read_csv(user_file.file_path)
        elif user_file.file_type == FileType.JSON:
            df = pd.read_json(user_file.file_path)
        elif user_file.file_type == FileType.EXCEL:
            df = pd.read_excel(user_file.file_path)
        else:
            raise bad_request_error(
                error_code="UNSUPPORTED_FILE_TYPE",
                message="Unsupported file type",
                extra={
                    "file_type": user_file.file_type.value if user_file else "unknown",
                    "supported_types": ["CSV", "JSON", "EXCEL"],
                },
            )

        # Save the DataFrame as a temporary CSV for loading by LangChain CSVLoader
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        df.to_csv(temp_file.name, index=False)
        temp_file.close()

        # Load CSV content as documents
        loader = CSVLoader(file_path=temp_file.name)
        documents = loader.load()

        # Create prompt template with previous Q&A context
        prompt = PromptTemplate.from_template(
            """You are an expert data analyst assistant helping users understand their data.

═══════════════════════════════════════════════════════════════════
CONTEXT YOU HAVE ACCESS TO
═══════════════════════════════════════════════════════════════════

1. DATA SAMPLE: {data_sample_info}
   → Use this to see actual values, understand data structure, and provide specific examples
   → For small files (≤50 rows): This is the COMPLETE dataset
   → For medium files (51-200 rows): This shows 100 rows
   → For large files (>200 rows): This shows 100 rows

2. FULL DATASET STATISTICS: Complete analysis of ALL rows
   → Use this for accurate counts, averages, percentages, correlations
   → This reflects the ENTIRE dataset, not just the sample
   → ALWAYS use this for statistical questions

3. PREVIOUS CONVERSATION: Q&A history for contextual understanding
   → Use when user references earlier questions or uses "it", "that", "before"

═══════════════════════════════════════════════════════════════════
CRITICAL GUIDELINES
═══════════════════════════════════════════════════════════════════

1. ACCURACY FIRST
   ✓ Use Full Dataset Statistics for all calculations (counts, averages, percentages)
   ✓ Data Sample is for examples and understanding structure only
   ✓ Never make up or guess information
   ✓ If data is insufficient, clearly state what's missing

2. SHOW YOUR WORK
   ✓ Cite specific columns, values, or statistics
   ✓ Explain calculations: "Average = Sum / Count = 1,234 / 50 = 24.7"
   ✓ Reference your sources: "Based on the 'Age' column statistics..."

3. CONVERSATIONAL AWARENESS
   ✓ If user says "it", "that", "before", "earlier" → check Q&A History
   ✓ Build on previous answers to create connected responses
   ✓ Reference previous questions when relevant: "As we discussed earlier..."

4. FORMAT INTELLIGENTLY
   For numerical comparisons → Use tables or structured lists
   For trends/patterns → Clear descriptions + specific examples from sample
   For yes/no questions → Answer directly first, then provide evidence
   For "how many" or counts → State number upfront, then breakdown
   For top/bottom N → Show ranked list with values

5. PROVIDE INSIGHTS
   ✓ Don't just answer - add relevant insights
   ✓ Point out patterns or anomalies
   ✓ Suggest follow-up questions when appropriate

6. HANDLE EDGE CASES
   ✓ Missing data: State percentage and impact
   ✓ Outliers: Mention if they affect analysis
   ✓ Insufficient data: Explain what's needed

═══════════════════════════════════════════════════════════════════
DATA INPUTS
═══════════════════════════════════════════════════════════════════

CURRENT QUESTION:
{question}

PREVIOUS Q&A HISTORY:
{previous_qa_history}

DATA SAMPLE ({data_sample_info}):
{data}

FULL DATASET STATISTICS:
{data_description}

═══════════════════════════════════════════════════════════════════

Provide your answer (follow all guidelines above):
"""
        )

        # Prepare CSV preview with smart row selection
        # Goal: Give as much data as possible without exceeding token limits
        # Strategy: Start with 100 rows, if file is smaller, use all rows
        total_rows = len(df)
        
        if total_rows <= 50:
            # Small file: use all data
            data_sample = df.to_csv(index=False)
            rows_used = total_rows
        elif total_rows <= 200:
            # Medium file: use up to 100 rows
            data_sample = df.head(100).to_csv(index=False)
            rows_used = 100
        else:
            # Large file: use 100 rows (token limit consideration)
            data_sample = df.head(100).to_csv(index=False)
            rows_used = 100
        
        data = data_sample

        # Format previous Q&A history
        previous_qa_text = ""
        if previous_qa:
            # Reverse to show chronological order (oldest first)
            previous_qa_text = "\n".join(
                [f"Q: {qa.question}\nA: {qa.answer}\n" for qa in reversed(previous_qa)]
            )
        else:
            previous_qa_text = "No previous Q&A history for this file."

        # Chain setup using Runnable
        chain: Runnable = (
            prompt
            | ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=request.model,  # Use the selected model
                temperature=0,
            )
            | StrOutputParser()
        )

        payload = {
            "question": request.question,
            "previous_qa_history": previous_qa_text,
            "data": data,
            "data_sample_info": f"Showing {rows_used} of {total_rows} total rows",
            "data_description": (
                f"FULL DATASET STATISTICS (all {total_rows} rows):\n"
                f"Columns: {df.columns.tolist()}\n"
                f"Describe: \n{df.describe().to_string()}\n"
                f"Missing values: {df.isnull().sum().to_dict()}\n"
                f"Missing percentage: {(df.isnull().mean() * 100).round(2).to_dict()}\n"
                f"Unique values: {df.nunique().to_dict()}\n"
                f"Data types: {df.dtypes.astype(str).to_dict()}\n"
                f"Correlation (numeric columns): {df.corr(numeric_only=True).round(2).to_dict()}"
            ),
        }

        # Print the formatted prompt before sending to chain
        formatted_prompt = prompt.format(**payload)
        # ✅ Save to file
        with open("formatted_prompt.txt", "w", encoding="utf-8") as f:
            f.write(formatted_prompt)

        # 2. Estimate token usage and check limit BEFORE making API call
        encoding = tiktoken.encoding_for_model(request.model)
        estimated_prompt_tokens = len(encoding.encode(formatted_prompt))
        # Estimate completion tokens (typically 20-50% of prompt length for Q&A)
        estimated_completion_tokens = int(estimated_prompt_tokens * 0.3)
        estimated_total_tokens = estimated_prompt_tokens + estimated_completion_tokens

        # Check if user has enough tokens for this request
        if not UsageService.check_usage_limit(
            db, str(current_user.id), "openai_tokens", estimated_total_tokens
        ):
            # Get current usage to show user helpful info
            usage_summary = UsageService.get_usage_summary(db, str(current_user.id))
            current_usage = usage_summary.current_month.get("openai_tokens", 0)
            limit = usage_summary.limits.get("openai_tokens", 0)
            remaining = max(0, limit - current_usage)

            raise bad_request_error(
                error_code="QUOTA_EXCEEDED",
                message=f"AI token limit exceeded. This request requires approximately {estimated_total_tokens:,} tokens, but you only have {int(remaining):,} tokens remaining this month (used {int(current_usage):,} of {int(limit):,}). Please upgrade your plan or purchase additional tokens.",
                extra={
                    "estimated_tokens": estimated_total_tokens,
                    "limit_type": "openai_tokens",
                    "current_usage": int(current_usage),
                    "monthly_limit": int(limit),
                    "remaining": int(remaining),
                },
            )

        # Use OpenAI callback to get EXACT token usage from OpenAI API
        with get_openai_callback() as cb:
            response = await chain.ainvoke(payload)

            # Get ACTUAL token usage from OpenAI's API response
            prompt_tokens = cb.prompt_tokens
            completion_tokens = cb.completion_tokens
            tokens_used = cb.total_tokens

        # Calculate processing time
        processing_time = time.time() - start_time

        # Count tokens used in pure request of user
        encoding = tiktoken.encoding_for_model(request.model)
        pure_prompt_tokens = len(encoding.encode(formatted_prompt))
        pure_completion_tokens = len(encoding.encode(response))
        pure_tokens_used = pure_prompt_tokens + pure_completion_tokens

        # Create FileQA record
        file_qa = FileQA(
            user_id=current_user.id,
            file_id=user_file.id,
            question=request.question,
            answer=response,
            gpt_model=GPTModelType(request.model),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            tokens_used=tokens_used,
            processing_time=processing_time,
            context_used=formatted_prompt,
            confidence_score=1.0,  # Default confidence score
        )

        db.add(file_qa)
        db.commit()
        db.refresh(file_qa)

        # 3. Track AI prompt usage (count)
        UsageService.track_usage(
            db=db,
            user_id=str(current_user.id),
            feature="ai_prompts",
            amount=1,
            description=f"AI Q&A: {request.question[:50]}...",
        )

        # 4. Track actual token usage
        UsageService.track_usage(
            db=db,
            user_id=str(current_user.id),
            feature="openai_tokens",
            amount=tokens_used,
            description=f"AI Q&A tokens for: {request.question[:50]}...",
        )

        return {"answer": response, "qa_id": str(file_qa.id)}

    except Exception as e:
        import traceback

        error_message = str(e)
        traceback.print_exc()

        # Create FileQA record for the error (only if user_file was found)
        if user_file:
            file_qa = FileQA(
                user_id=current_user.id,
                file_id=user_file.id,
                question=request.question,
                answer="Error occurred while processing the request",
                gpt_model=GPTModelType(request.model),
                processing_time=time.time() - start_time,
                error_message=error_message,
            )

            db.add(file_qa)
            db.commit()

        raise internal_server_error(
            message="An error occurred while processing your request. Please try again later.",
            extra={
                "error_details": error_message,
                "file_id": request.file_id,
                "model": request.model,
            },
        )

    finally:
        # Delete the temporary file (only if it was created)
        if temp_file and os.path.exists(temp_file.name):
            os.remove(temp_file.name)


async def determine_file_type(user_id: str, file_id: str, db: Session) -> str:
    """
    Determine the file type based on the file_id by querying the database.
    """
    try:
        data = await DataService.get_data_by_ids(
            user_id=user_id, file_id=file_id, db=db
        )
        if data:
            return data.file_type.value.lower()
    except Exception:
        pass

    raise bad_request_error(
        error_code="UNSUPPORTED_FILE_TYPE",
        message="Unsupported or unknown file type",
        extra={"file_id": file_id},
    )


@llm_router.get("/qa-history")
async def get_qa_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    file_id: Optional[str] = None,
):
    """
    Get Q&A history for the current user.
    Optionally filter by file_id.
    """
    query = db.query(FileQA).filter(FileQA.user_id == current_user.id)

    if file_id:
        query = query.filter(FileQA.file_id == file_id)

    total = query.count()
    qa_records = query.order_by(desc(FileQA.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": str(qa.id),
                "file_id": str(qa.file_id),
                "question": qa.question,
                "answer": qa.answer,
                "gpt_model": qa.gpt_model.value,
                "prompt_tokens": qa.prompt_tokens,
                "completion_tokens": qa.completion_tokens,
                "tokens_used": qa.tokens_used,
                "processing_time": qa.processing_time,
                "confidence_score": qa.confidence_score,
                "feedback_score": qa.feedback_score,
                "feedback_comment": qa.feedback_comment,
                "created_at": qa.created_at,
            }
            for qa in qa_records
        ],
    }


@llm_router.get("/qa/{qa_id}")
async def get_qa_by_id(
    qa_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific Q&A record by ID.
    """
    qa = (
        db.query(FileQA)
        .filter(FileQA.id == qa_id, FileQA.user_id == current_user.id)
        .first()
    )

    if not qa:
        raise not_found_error(message="Q&A record not found", extra={"qa_id": qa_id})

    return {
        "id": str(qa.id),
        "file_id": str(qa.file_id),
        "question": qa.question,
        "answer": qa.answer,
        "gpt_model": qa.gpt_model.value,
        "prompt_tokens": qa.prompt_tokens,
        "completion_tokens": qa.completion_tokens,
        "tokens_used": qa.tokens_used,
        "processing_time": qa.processing_time,
        "confidence_score": qa.confidence_score,
        "feedback_score": qa.feedback_score,
        "feedback_comment": qa.feedback_comment,
        "context_used": qa.context_used,
        "created_at": qa.created_at,
        "updated_at": qa.updated_at,
    }


@llm_router.put("/qa/{qa_id}/feedback")
async def update_qa_feedback(
    qa_id: str,
    feedback_score: int = Body(..., ge=1, le=5),
    feedback_comment: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update feedback for a Q&A record.
    """
    qa = (
        db.query(FileQA)
        .filter(FileQA.id == qa_id, FileQA.user_id == current_user.id)
        .first()
    )

    if not qa:
        raise not_found_error(message="Q&A record not found", extra={"qa_id": qa_id})

    qa.feedback_score = feedback_score
    qa.feedback_comment = feedback_comment

    db.commit()
    db.refresh(qa)

    return {
        "id": str(qa.id),
        "feedback_score": qa.feedback_score,
        "feedback_comment": qa.feedback_comment,
        "updated_at": qa.updated_at,
    }


@llm_router.delete("/qa/{qa_id}")
async def delete_qa(
    qa_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a Q&A record.
    """
    qa = (
        db.query(FileQA)
        .filter(FileQA.id == qa_id, FileQA.user_id == current_user.id)
        .first()
    )

    if not qa:
        raise not_found_error(message="Q&A record not found", extra={"qa_id": qa_id})

    db.delete(qa)
    db.commit()

    return {"message": "Q&A record deleted successfully"}
