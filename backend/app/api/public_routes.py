from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse , name="home")
async def home(request: Request):
    from app.core.config import settings
    # Generate fake data for the template
    template_data = {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL,
        "meta_description": "DataPilot - Your AI-Powered Data Analysis Platform",
        "meta_author": "DataPilot Team",
        "title": "DataPilot - AI-Powered Data Analysis",
        "header_title": "Transform Your Data into Actionable Insights",
        "header_description": "Leverage the power of AI to analyze, visualize, and understand your data like never before. Make data-driven decisions with confidence.",
        "header_image": "https://dummyimage.com/600x400/343a40/6c757d",
        "features_heading": "Why Choose DataPilot?",
        "features": [
            {
                "icon": "bi-graph-up",
                "title": "Advanced Analytics",
                "description": "Powerful AI algorithms that help you uncover hidden patterns and insights in your data."
            },
            {
                "icon": "bi-lightning-charge",
                "title": "Real-time Processing",
                "description": "Process and analyze your data in real-time with our high-performance computing infrastructure."
            },
            {
                "icon": "bi-shield-check",
                "title": "Enterprise Security",
                "description": "Bank-grade security with end-to-end encryption and compliance with industry standards."
            },
            {
                "icon": "bi-people",
                "title": "Collaborative Workspace",
                "description": "Work together seamlessly with team collaboration features and shared workspaces."
            }
        ],
        "testimonial": {
            "text": "DataPilot has revolutionized how we handle our data analysis. The AI-powered insights have helped us make better decisions and save countless hours of manual work.",
            "name": "Sarah Johnson",
            "title": "Data Science Director, TechCorp",
            "image_url": "https://dummyimage.com/40x40/ced4da/6c757d"
        },
        "blog_intro": "Stay updated with the latest trends in data science, AI, and analytics.",
        "blog_posts": [
            {
                "title": "The Future of AI in Data Analysis",
                "description": "Exploring how artificial intelligence is transforming the landscape of data analysis and business intelligence.",
                "category": "AI & ML",
                "image_url": "https://dummyimage.com/600x350/ced4da/6c757d",
                "author": "Dr. Michael Chen",
                "author_image": "https://dummyimage.com/40x40/ced4da/6c757d",
                "date": "March 15, 2024",
                "read_time": "8",
                "link": "#"
            },
            {
                "title": "Data Visualization Best Practices",
                "description": "Learn the essential principles of creating effective and insightful data visualizations that tell compelling stories.",
                "category": "Data Viz",
                "image_url": "https://dummyimage.com/600x350/adb5bd/495057",
                "author": "Emily Rodriguez",
                "author_image": "https://dummyimage.com/40x40/ced4da/6c757d",
                "date": "March 10, 2024",
                "read_time": "6",
                "link": "#"
            },
            {
                "title": "Big Data Processing at Scale",
                "description": "Discover how modern organizations are handling massive datasets efficiently and effectively.",
                "category": "Big Data",
                "image_url": "https://dummyimage.com/600x350/6c757d/343a40",
                "author": "James Wilson",
                "author_image": "https://dummyimage.com/40x40/ced4da/6c757d",
                "date": "March 5, 2024",
                "read_time": "10",
                "link": "#"
            }
        ],
        "site_name": "DataPilot",
        "current_year": 2024
    }
    return templates.TemplateResponse("index.html", template_data)

@router.get("/about", response_class=HTMLResponse)
async def about(request: Request):
    from app.core.config import settings
    return templates.TemplateResponse("about.html", {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL
    })

@router.get("/contact", response_class=HTMLResponse, name="contact")
async def contact(request: Request):
    from app.core.config import settings
    return templates.TemplateResponse("contact.html", {
        "request": request,
        "contact_email": settings.CONTACT_EMAIL,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL
    })

@router.get("/pricing", response_class=HTMLResponse)
async def pricing(request: Request):
    from app.core.config import settings
    # Fetch plans from the API
    import httpx
    import json
    
    plans_data = {
        "main_plans": [],
        "addons": [],
        "error": None
    }
    
    try:
        async with httpx.AsyncClient() as client:
            # Get main plans
            response = await client.get("http://localhost:8000/api/v1/pricing/plans/main")
            if response.status_code == 200:
                plans_data["main_plans"] = response.json()
            
            # Get addons
            response = await client.get("http://localhost:8000/api/v1/pricing/plans/addons")
            if response.status_code == 200:
                plans_data["addons"] = response.json()
                
    except Exception as e:
        plans_data["error"] = str(e)
        # Fallback to static plans if API is not available
        plans_data["main_plans"] = [
            {
                "id": "free-plan",
                "name": "Free",
                "description": "Perfect for getting started with data analysis",
                "price_monthly": 0.0,
                "file_limit": 1,
                "file_size_limit_mb": 5,
                "storage_limit_gb": 0.005,
                "rules_limit": 1,
                "custom_lists_limit": 1,
                "ai_prompts_per_month": 100,
                "ai_tokens_per_month": 50000,
                "synthetic_rows_per_month": 500,
                "priority_processing": False,
                "team_sharing": False,
                "features": {}
            },
            {
                "id": "pro-plan",
                "name": "Pro",
                "description": "Advanced features for power users and small teams",
                "price_monthly": 9.0,
                "file_limit": 10,
                "file_size_limit_mb": 50,
                "storage_limit_gb": 5.0,
                "rules_limit": 20,
                "custom_lists_limit": -1,  # Unlimited
                "ai_prompts_per_month": 5000,
                "ai_tokens_per_month": 500000,
                "synthetic_rows_per_month": 20000,
                "priority_processing": False,
                "team_sharing": False,
                "features": {}
            },
            {
                "id": "business-plan",
                "name": "Business",
                "description": "Enterprise-grade features for teams and organizations",
                "price_monthly": 29.0,
                "file_limit": 50,
                "file_size_limit_mb": 200,
                "storage_limit_gb": 20.0,
                "rules_limit": 100,
                "custom_lists_limit": -1,  # Unlimited
                "ai_prompts_per_month": 25000,
                "ai_tokens_per_month": 2000000,
                "synthetic_rows_per_month": 100000,
                "priority_processing": True,
                "team_sharing": True,
                "features": {}
            }
        ]
        plans_data["addons"] = [
            {
                "id": "storage-addon",
                "name": "Extra Storage",
                "description": "Additional storage space for your data",
                "price_monthly": 2.0,
                "features": {"addon_type": "storage", "unit": "GB"}
            },
            {
                "id": "tokens-addon",
                "name": "Extra AI Tokens",
                "description": "Additional AI token allocation",
                "price_monthly": 3.0,
                "features": {"addon_type": "tokens", "unit": "100k tokens"}
            },
            {
                "id": "synthetic-addon",
                "name": "Extra Synthetic Data",
                "description": "Additional synthetic data generation capacity",
                "price_monthly": 2.0,
                "features": {"addon_type": "synthetic", "unit": "10k rows"}
            }
        ]
    
    template_data = {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL,
        "title": "Pricing - Datilio",
        "meta_description": "Choose the perfect plan for your data analysis needs. Free, Pro, and Business plans available with flexible pricing.",
        "plans": plans_data,
        "site_name": "Datilio",
        "current_year": 2024
    }
    
    return templates.TemplateResponse("pricing.html", template_data)

@router.get("/faq", response_class=HTMLResponse)
async def faq(request: Request):
    from app.core.config import settings
    return templates.TemplateResponse("faq.html", {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL
    })

@router.get("/tutorials", response_class=HTMLResponse)
async def tutorials(request: Request):
    from app.core.config import settings
    return templates.TemplateResponse("tutorials.html", {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL,
        "title": "Video Tutorials - Datilio",
        "meta_description": "Learn how to use Datilio with our comprehensive video tutorials. Watch step-by-step guides on data analysis, visualization, and AI-powered insights."
    })

@router.get("/blog-home", response_class=HTMLResponse)
async def blog_home(request: Request):
    # Use the blog service directly instead of HTTP calls
    from app.services.blog_service import BlogService
    from app.schemas.blog_schemas import BlogPostListQuery
    from app.core.db_setup import SessionLocal
    from app.core.config import settings
    
    blog_data = {
        "blog_posts": [],
        "total": 0,
        "current_page": 1,
        "total_pages": 0,
        "error": None
    }
    
    try:
        # Create database session
        db = SessionLocal()
        
        # Create query parameters
        query_params = BlogPostListQuery(
            page=1,
            limit=12,
            published_only=True
        )
        
        # Get blog posts using service
        posts, total = BlogService.get_blog_posts(db, query_params)
        
        # Convert to template format
        blog_posts = []
        for post in posts:
            blog_posts.append({
                "id": str(post.id),
                "title": post.title,
                "slug": post.slug,
                "summary": post.summary,
                "featured_image_url": post.featured_image_url,
                "author_name": post.author_name,
                "category": post.category,
                "tags": post.tags_list,
                "is_published": post.is_published,
                "view_count": post.view_count,
                "reading_time_minutes": post.reading_time_minutes,
                "created_at": post.created_at,
                "published_at": post.published_at
            })
        
        # Calculate pagination
        total_pages = (total + query_params.limit - 1) // query_params.limit
        
        blog_data.update({
            "blog_posts": blog_posts,
            "total": total,
            "current_page": query_params.page,
            "total_pages": total_pages
        })
        
        db.close()
        
    except Exception as e:
        blog_data["error"] = str(e)
        print(f"Error fetching blog posts: {e}")
    
    template_data = {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL,
        "title": "Blog - Datilio",
        "meta_description": "Stay updated with the latest trends in data science, AI, and analytics from the Datilio team.",
        **blog_data
    }
    
    return templates.TemplateResponse("blog-home.html", template_data)

@router.get("/blog-post/{slug}", response_class=HTMLResponse)
async def blog_post(request: Request, slug: str):
    # Use the blog service directly instead of HTTP calls
    from app.services.blog_service import BlogService
    from app.core.db_setup import SessionLocal
    from fastapi.responses import RedirectResponse
    from app.core.config import settings
    
    blog_data = {
        "blog_post": None,
        "related_posts": [],
        "error": None
    }
    
    try:
        # Create database session
        db = SessionLocal()
        
        # Get blog post by slug
        post = BlogService.get_blog_post_by_slug(db, slug, published_only=True)
        
        if not post:
            db.close()
            return RedirectResponse(url="/blog-home", status_code=302)
        
        # Convert post to template format
        blog_data["blog_post"] = {
            "id": str(post.id),
            "title": post.title,
            "slug": post.slug,
            "summary": post.summary,
            "featured_image_url": post.featured_image_url,
            "content": post.content,
            "author_name": post.author_name,
            "author_email": post.author_email,
            "category": post.category,
            "tags": post.tags_list,
            "is_published": post.is_published,
            "view_count": post.view_count,
            "reading_time_minutes": post.reading_time_minutes,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "published_at": post.published_at,
            "meta_description": post.meta_description,
            "meta_keywords": post.meta_keywords
        }
        
        # Get related posts
        related_posts = BlogService.get_related_posts(db, post.id, limit=3)
        blog_data["related_posts"] = [
            {
                "id": str(related_post.id),
                "title": related_post.title,
                "slug": related_post.slug,
                "summary": related_post.summary,
                "featured_image_url": related_post.featured_image_url,
                "author_name": related_post.author_name,
                "category": related_post.category,
                "tags": related_post.tags_list,
                "is_published": related_post.is_published,
                "view_count": related_post.view_count,
                "reading_time_minutes": related_post.reading_time_minutes,
                "created_at": related_post.created_at,
                "published_at": related_post.published_at
            }
            for related_post in related_posts
        ]
        
        db.close()
        
    except Exception as e:
        blog_data["error"] = str(e)
        print(f"Error fetching blog post: {e}")
    
    if not blog_data["blog_post"]:
        return RedirectResponse(url="/blog-home", status_code=302)
    
    template_data = {
        "request": request,
        "buymeacoffee_url": settings.BUYMEACOFFEE_URL,
        "title": f"{blog_data['blog_post']['title']} - Datilio Blog",
        "meta_description": blog_data["blog_post"].get("summary", ""),
        **blog_data
    }
    
    return templates.TemplateResponse("blog-post.html", template_data)


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    from app.core.config import settings
    return RedirectResponse(url=f"{settings.FRONTEND_BASE_URL}/") 