from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.db_setup import get_db
from app.services.blog_service import BlogService
from app.schemas.blog_schemas import (
    BlogPostCreate,
    BlogPostUpdate,
    BlogPostResponse,
    BlogPostListResponse,
    BlogPostListQuery
)

router = APIRouter()


@router.get("/", response_model=BlogPostListResponse)
async def get_blog_posts(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Number of posts per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    published_only: bool = Query(True, description="Show only published posts"),
    search: Optional[str] = Query(None, description="Search in title and summary"),
    db: Session = Depends(get_db)
):
    """Get paginated list of blog posts"""
    query_params = BlogPostListQuery(
        page=page,
        limit=limit,
        category=category,
        tag=tag,
        published_only=published_only,
        search=search
    )
    
    posts, total = BlogService.get_blog_posts(db, query_params)
    
    # Convert to response format
    post_responses = []
    for post in posts:
        post_responses.append({
            "id": post.id,
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
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "posts": post_responses,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }


@router.get("/{post_id}", response_model=BlogPostResponse)
async def get_blog_post(
    post_id: UUID,
    increment_view: bool = Query(True, description="Increment view count"),
    db: Session = Depends(get_db)
):
    """Get a specific blog post by ID"""
    post = BlogService.get_blog_post(db, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )
    
    # Increment view count if requested
    if increment_view:
        BlogService.increment_view_count(db, post_id)
    
    return BlogPostResponse(
        id=post.id,
        title=post.title,
        slug=post.slug,
        summary=post.summary,
        featured_image_url=post.featured_image_url,
        content=post.content,
        author_name=post.author_name,
        author_email=post.author_email,
        category=post.category,
        tags=post.tags_list,
        is_published=post.is_published,
        view_count=post.view_count,
        reading_time_minutes=post.reading_time_minutes,
        created_at=post.created_at,
        updated_at=post.updated_at,
        published_at=post.published_at,
        meta_description=post.meta_description,
        meta_keywords=post.meta_keywords
    )


@router.get("/slug/{slug}", response_model=BlogPostResponse)
async def get_blog_post_by_slug(
    slug: str,
    increment_view: bool = Query(True, description="Increment view count"),
    db: Session = Depends(get_db)
):
    """Get a specific blog post by slug"""
    post = BlogService.get_blog_post_by_slug(db, slug, published_only=True)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )
    
    # Increment view count if requested
    if increment_view:
        BlogService.increment_view_count(db, post.id)
    
    return BlogPostResponse(
        id=post.id,
        title=post.title,
        slug=post.slug,
        summary=post.summary,
        featured_image_url=post.featured_image_url,
        content=post.content,
        author_name=post.author_name,
        author_email=post.author_email,
        category=post.category,
        tags=post.tags_list,
        is_published=post.is_published,
        view_count=post.view_count,
        reading_time_minutes=post.reading_time_minutes,
        created_at=post.created_at,
        updated_at=post.updated_at,
        published_at=post.published_at,
        meta_description=post.meta_description,
        meta_keywords=post.meta_keywords
    )


@router.post("/", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
async def create_blog_post(
    blog_data: BlogPostCreate,
    db: Session = Depends(get_db)
):
    """Create a new blog post (Admin only)"""
    try:
        post = BlogService.create_blog_post(db, blog_data)
        return BlogPostResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            summary=post.summary,
            featured_image_url=post.featured_image_url,
            content=post.content,
            author_name=post.author_name,
            author_email=post.author_email,
            category=post.category,
            tags=post.tags_list,
            is_published=post.is_published,
            view_count=post.view_count,
            reading_time_minutes=post.reading_time_minutes,
            created_at=post.created_at,
            updated_at=post.updated_at,
            published_at=post.published_at,
            meta_description=post.meta_description,
            meta_keywords=post.meta_keywords
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    post_id: UUID,
    update_data: BlogPostUpdate,
    db: Session = Depends(get_db)
):
    """Update a blog post (Admin only)"""
    try:
        post = BlogService.update_blog_post(db, post_id, update_data)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blog post not found"
            )
        
        return BlogPostResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            summary=post.summary,
            featured_image_url=post.featured_image_url,
            content=post.content,
            author_name=post.author_name,
            author_email=post.author_email,
            category=post.category,
            tags=post.tags_list,
            is_published=post.is_published,
            view_count=post.view_count,
            reading_time_minutes=post.reading_time_minutes,
            created_at=post.created_at,
            updated_at=post.updated_at,
            published_at=post.published_at,
            meta_description=post.meta_description,
            meta_keywords=post.meta_keywords
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    post_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a blog post (Admin only)"""
    success = BlogService.delete_blog_post(db, post_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )


@router.get("/categories/list", response_model=List[str])
async def get_categories(db: Session = Depends(get_db)):
    """Get all unique categories"""
    return BlogService.get_categories(db)


@router.get("/tags/list", response_model=List[str])
async def get_tags(db: Session = Depends(get_db)):
    """Get all unique tags"""
    return BlogService.get_tags(db)


@router.get("/{post_id}/related")
async def get_related_posts(
    post_id: UUID,
    limit: int = Query(3, ge=1, le=10, description="Number of related posts"),
    db: Session = Depends(get_db)
):
    """Get related blog posts"""
    related_posts = BlogService.get_related_posts(db, post_id, limit)
    
    return [
        {
            "id": post.id,
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
        }
        for post in related_posts
    ]


@router.get("/popular/list")
async def get_popular_posts(
    limit: int = Query(5, ge=1, le=20, description="Number of popular posts"),
    db: Session = Depends(get_db)
):
    """Get most viewed blog posts"""
    popular_posts = BlogService.get_popular_posts(db, limit)
    
    return [
        {
            "id": post.id,
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
        }
        for post in popular_posts
    ]


@router.get("/recent/list")
async def get_recent_posts(
    limit: int = Query(5, ge=1, le=20, description="Number of recent posts"),
    db: Session = Depends(get_db)
):
    """Get most recent blog posts"""
    recent_posts = BlogService.get_recent_posts(db, limit)
    
    return [
        {
            "id": post.id,
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
        }
        for post in recent_posts
    ]
