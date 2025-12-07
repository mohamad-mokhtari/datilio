from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Set
from app.lists import synthethic_categories
from app.enums.mimesis_enums import (
    Algorithm,
    AudioFile,
    CardType,
    CompressedFile,
    CountryCode,
    DSNType,
    DocumentFile,
    DurationUnit,
    EANFormat,
    EmojyCategory,
    FileType,
    Gender,
    ISBNFormat,
    ImageFile,
    Locale,
    MeasureUnit,
    MetricPrefixSign,
    MimeType,
    NumType,
    PortRange,
    TLDType,
    TimestampFormat,
    TimezoneRegion,
    TitleType,
    URLScheme,
    VideoFile
)
from app.api.deps.user_deps import get_current_user
from app.models.user_model import User
from app.utils.http_exceptions import (
    not_found_error, bad_request_error, forbidden_error, 
    internal_server_error, unauthorized_error, validation_error,
    conflict_error, too_many_requests_error
)


enum_router = APIRouter()

def get_enum_values(enum_class):
    return {item.name: item.value for item in enum_class}

@enum_router.get("/enums")
def get_enums(current_user: User = Depends(get_current_user)):
    """Get all Mimesis enum values"""
    enums = {
        "mimesis" : {
            'Algorithm': get_enum_values(Algorithm),
            'AudioFile': get_enum_values(AudioFile),
            'CardType': get_enum_values(CardType),
            'CompressedFile': get_enum_values(CompressedFile),
            'CountryCode': get_enum_values(CountryCode),
            'DSNType': get_enum_values(DSNType),
            'DocumentFile': get_enum_values(DocumentFile),
            'DurationUnit': get_enum_values(DurationUnit),
            'EANFormat': get_enum_values(EANFormat),
            'EmojyCategory': get_enum_values(EmojyCategory),
            'FileType': get_enum_values(FileType),
            'Gender': get_enum_values(Gender),
            'ISBNFormat': get_enum_values(ISBNFormat),
            'ImageFile': get_enum_values(ImageFile),
            'Locale': get_enum_values(Locale),
            'MeasureUnit': get_enum_values(MeasureUnit),
            'MetricPrefixSign': get_enum_values(MetricPrefixSign),
            'MimeType': get_enum_values(MimeType),
            'NumType': get_enum_values(NumType),
            'PortRange': get_enum_values(PortRange),
            'TLDType': get_enum_values(TLDType),
            'TimestampFormat': get_enum_values(TimestampFormat),
            'TimezoneRegion': get_enum_values(TimezoneRegion),
            'TitleType': get_enum_values(TitleType),
            'URLScheme': get_enum_values(URLScheme),
            'VideoFile': get_enum_values(VideoFile),
        }
    }
    return enums

@enum_router.get("/categories")
async def get_categories(current_user: User = Depends(get_current_user)) -> Dict[str, Set[str]]:
    """Get all available synthetic data categories"""
    all_categories = set(synthethic_categories.ALL_DATA.keys())
    return {"synthethic_categories": all_categories}

@enum_router.get("/categories/{category}")
async def get_fields(category: str, current_user: User = Depends(get_current_user)) -> Dict[str, list]:
    """Get all fields for a specific category"""
    if category not in synthethic_categories.ALL_DATA:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"fields": synthethic_categories.ALL_DATA[category]}

@enum_router.get("/all-fields")
async def get_all_fields(current_user: User = Depends(get_current_user)) -> Dict[str, Dict[str, list]]:
    """Get all fields for all categories"""
    return {"fields": synthethic_categories.ALL_DATA}

@enum_router.get("/all")
async def get_all_data(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Get all data including enums, categories, and fields"""
    return {
        "enums": get_enums(),
        "categories": await get_categories(),
        "all_fields": await get_all_fields()
    }
