#!/usr/bin/env python3
"""
Script to create a sample blog post for testing the blog system
"""

import asyncio
import httpx
import json

# Sample blog post data
sample_blog_post = {
    "title": "Getting Started with FastAPI: A Modern Python Web Framework",
    "slug": "getting-started-fastapi-modern-python-web-framework",
    "summary": "A comprehensive guide to FastAPI, covering its key features, benefits, and how to build your first API with this modern Python framework.",
    "featured_image_url": "/static/blog_images/sample_featured_image.jpg",
    "content": {
        "summary": "A quick overview of FastAPI and why it's becoming popular for building modern APIs.",
        "body": [
            {
                "type": "heading",
                "level": 2,
                "text": "Introduction"
            },
            {
                "type": "paragraph",
                "text": "FastAPI is a modern web framework for building APIs with Python. It is known for performance, ease of use, and automatic docs generation. In this article, we'll explore why FastAPI has become so popular and how you can get started with it."
            },
            {
                "type": "image",
                "url": "/static/blog_images/fastapi_logo.png",
                "alt": "FastAPI Logo",
                "caption": "FastAPI is built for modern Python development"
            },
            {
                "type": "paragraph",
                "text": "Here's another image showing the FastAPI architecture:"
            },
            {
                "type": "image",
                "url": "/static/blog_images/sample_featured_image.jpg",
                "alt": "FastAPI Architecture",
                "caption": "FastAPI's clean and modern architecture"
            },
            {
                "type": "heading",
                "level": 3,
                "text": "Why Choose FastAPI?"
            },
            {
                "type": "list",
                "style": "unordered",
                "items": [
                    "Automatic validation and serialization",
                    "Async support out of the box",
                    "OpenAPI documentation generation",
                    "Type hints integration",
                    "High performance comparable to Node.js and Go"
                ]
            },
            {
                "type": "heading",
                "level": 3,
                "text": "Your First FastAPI Application"
            },
            {
                "type": "paragraph",
                "text": "Let's create a simple FastAPI application to see how easy it is to get started:"
            },
            {
                "type": "code",
                "language": "python",
                "content": "from fastapi import FastAPI\nfrom pydantic import BaseModel\nfrom typing import List\n\napp = FastAPI(title=\"My First API\", version=\"1.0.0\")\n\nclass Item(BaseModel):\n    name: str\n    description: str = None\n    price: float\n    tax: float = None\n\n@app.get(\"/\")\ndef read_root():\n    return {\"Hello\": \"World\"}\n\n@app.get(\"/items/{item_id}\")\ndef read_item(item_id: int, q: str = None):\n    return {\"item_id\": item_id, \"q\": q}\n\n@app.post(\"/items/\")\ndef create_item(item: Item):\n    return item\n\n@app.get(\"/items/\", response_model=List[Item])\ndef read_items():\n    return [\n        Item(name=\"Laptop\", price=999.99, tax=99.99),\n        Item(name=\"Mouse\", price=29.99, tax=2.99)\n    ]"
            },
            {
                "type": "heading",
                "level": 3,
                "text": "Key Features Explained"
            },
            {
                "type": "paragraph",
                "text": "Let's break down the key features that make FastAPI special:"
            },
            {
                "type": "heading",
                "level": 4,
                "text": "Automatic Validation"
            },
            {
                "type": "paragraph",
                "text": "FastAPI automatically validates request data based on your Pydantic models. If the data doesn't match the expected format, FastAPI returns a detailed error message."
            },
            {
                "type": "heading",
                "level": 4,
                "text": "Interactive Documentation"
            },
            {
                "type": "paragraph",
                "text": "FastAPI automatically generates interactive API documentation at /docs (Swagger UI) and /redoc (ReDoc). This makes it easy to test your API and share it with others."
            },
            {
                "type": "quote",
                "text": "FastAPI is one of the fastest frameworks for building APIs with Python, comparable to Node.js and Go.",
                "author": "TechCrunch"
            },
            {
                "type": "image",
                "url": "/static/blog_images/fastapi_logo.png",
                "alt": "Performance Comparison",
                "caption": "FastAPI's impressive performance metrics"
            },
            {
                "type": "heading",
                "level": 3,
                "text": "Performance Comparison"
            },
            {
                "type": "paragraph",
                "text": "FastAPI is built on top of Starlette and Pydantic, which makes it one of the fastest Python frameworks available. Here's how it compares to other popular frameworks:"
            },
            {
                "type": "list",
                "style": "ordered",
                "items": [
                    "FastAPI: ~60,000 requests/second",
                    "Flask: ~20,000 requests/second", 
                    "Django: ~15,000 requests/second",
                    "Express.js (Node.js): ~50,000 requests/second"
                ]
            },
            {
                "type": "heading",
                "level": 3,
                "text": "Conclusion"
            },
            {
                "type": "paragraph",
                "text": "FastAPI is an excellent choice for building modern APIs with Python. Its combination of performance, ease of use, and automatic documentation makes it a compelling alternative to traditional frameworks like Flask and Django for API development."
            },
            {
                "type": "paragraph",
                "text": "Whether you're building a simple REST API or a complex microservice, FastAPI provides the tools and performance you need to succeed. Give it a try in your next project!"
            }
        ]
    },
    "author_name": "Datilio Team",
    "author_email": "team@datility.com",
    "category": "Tutorials",
    "tags": ["Python", "FastAPI", "Web Development", "API", "Tutorial"],
    "is_published": True,
    "meta_description": "Learn how to build modern APIs with FastAPI, a high-performance Python web framework with automatic validation and documentation.",
    "meta_keywords": "FastAPI, Python, API, web framework, tutorial, REST API"
}

async def create_sample_blog_post():
    """Create a sample blog post via the API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/api/v1/blog/",
                json=sample_blog_post,
                timeout=30.0
            )
            
            if response.status_code == 201:
                print("✅ Sample blog post created successfully!")
                print(f"📝 Title: {sample_blog_post['title']}")
                print(f"🔗 Slug: {sample_blog_post['slug']}")
                print(f"📊 Response: {response.json()}")
            else:
                print(f"❌ Failed to create blog post. Status: {response.status_code}")
                print(f"📄 Response: {response.text}")
                
    except httpx.ConnectError:
        print("❌ Could not connect to the API. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error creating blog post: {e}")

if __name__ == "__main__":
    print("🚀 Creating sample blog post...")
    asyncio.run(create_sample_blog_post())
