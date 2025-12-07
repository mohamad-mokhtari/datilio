from pydantic import BaseModel, Field, validator
from typing import List, Optional, Union, Dict, Any
from datetime import datetime
from uuid import UUID


class BlogContentItem(BaseModel):
    """Schema for individual blog content items"""
    type: str = Field(..., description="Type of content: heading, paragraph, image, code, quote, list")
    text: Optional[str] = Field(None, description="Text content for headings, paragraphs, quotes")
    level: Optional[int] = Field(None, ge=1, le=6, description="Heading level (1-6) for headings")
    url: Optional[str] = Field(None, description="Image URL for images")
    alt: Optional[str] = Field(None, description="Alt text for images")
    caption: Optional[str] = Field(None, description="Caption for images")
    language: Optional[str] = Field(None, description="Programming language for code blocks")
    content: Optional[str] = Field(None, description="Code content for code blocks")
    author: Optional[str] = Field(None, description="Author for quotes")
    style: Optional[str] = Field(None, description="List style: ordered or unordered")
    items: Optional[List[str]] = Field(None, description="List items")

    @validator('type')
    def validate_type(cls, v):
        allowed_types = ['heading', 'paragraph', 'image', 'code', 'quote', 'list']
        if v not in allowed_types:
            raise ValueError(f'Type must be one of: {", ".join(allowed_types)}')
        return v

    @validator('level')
    def validate_level(cls, v, values):
        if values.get('type') == 'heading' and v is None:
            raise ValueError('Level is required for heading type')
        return v

    @validator('text')
    def validate_text(cls, v, values):
        if values.get('type') in ['heading', 'paragraph', 'quote'] and not v:
            raise ValueError('Text is required for heading, paragraph, and quote types')
        return v

    @validator('url')
    def validate_url(cls, v, values):
        if values.get('type') == 'image' and not v:
            raise ValueError('URL is required for image type')
        return v

    @validator('content')
    def validate_content(cls, v, values):
        if values.get('type') == 'code' and not v:
            raise ValueError('Content is required for code type')
        return v

    @validator('items')
    def validate_items(cls, v, values):
        if values.get('type') == 'list' and not v:
            raise ValueError('Items are required for list type')
        return v


class BlogContent(BaseModel):
    """Schema for blog content structure"""
    summary: str = Field("", description="Quick overview of the blog post")
    body: List[BlogContentItem] = Field(default_factory=list, description="List of content items")

    @validator('body')
    def validate_body(cls, v):
        # Allow empty body for draft posts
        return v


class BlogPostBase(BaseModel):
    """Base schema for blog post"""
    title: str = Field(..., min_length=1, max_length=255, description="Blog post title")
    slug: str = Field(..., min_length=1, max_length=255, description="URL-friendly slug")
    summary: Optional[str] = Field(None, description="Brief summary of the post")
    featured_image_url: Optional[str] = Field(None, max_length=500, description="Featured image URL")
    content: BlogContent = Field(..., description="Blog content structure")
    author_name: str = Field("Datilio Team", max_length=100, description="Author name")
    author_email: Optional[str] = Field(None, max_length=255, description="Author email")
    category: str = Field("General", max_length=50, description="Blog category")
    tags: Optional[List[str]] = Field(None, description="List of tags")
    is_published: bool = Field(False, description="Whether the post is published")
    meta_description: Optional[str] = Field(None, max_length=300, description="SEO meta description")
    meta_keywords: Optional[str] = Field(None, max_length=500, description="SEO meta keywords")

    @validator('slug')
    def validate_slug(cls, v):
        # Basic slug validation - only lowercase letters, numbers, and hyphens
        import re
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        if v is not None:
            # Remove empty tags and limit to 10 tags
            v = [tag.strip() for tag in v if tag.strip()]
            if len(v) > 10:
                raise ValueError('Maximum 10 tags allowed')
        return v


class BlogPostCreate(BlogPostBase):
    """Schema for creating a blog post"""
    pass


class BlogPostUpdate(BaseModel):
    """Schema for updating a blog post"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    summary: Optional[str] = None
    featured_image_url: Optional[str] = Field(None, max_length=500)
    content: Optional[BlogContent] = None
    author_name: Optional[str] = Field(None, max_length=100)
    author_email: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=50)
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    meta_description: Optional[str] = Field(None, max_length=300)
    meta_keywords: Optional[str] = Field(None, max_length=500)

    @validator('slug')
    def validate_slug(cls, v):
        if v is not None:
            import re
            if not re.match(r'^[a-z0-9-]+$', v):
                raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        if v is not None:
            v = [tag.strip() for tag in v if tag.strip()]
            if len(v) > 10:
                raise ValueError('Maximum 10 tags allowed')
        return v


class BlogPostResponse(BlogPostBase):
    """Schema for blog post response"""
    id: UUID
    view_count: int
    reading_time_minutes: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


class BlogPostListResponse(BaseModel):
    """Schema for blog post list response"""
    id: UUID
    title: str
    slug: str
    summary: Optional[str]
    featured_image_url: Optional[str]
    author_name: str
    category: str
    tags: List[str]
    is_published: bool
    view_count: int
    reading_time_minutes: int
    created_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


class BlogPostListQuery(BaseModel):
    """Schema for blog post list query parameters"""
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=50, description="Number of posts per page")
    category: Optional[str] = Field(None, description="Filter by category")
    tag: Optional[str] = Field(None, description="Filter by tag")
    published_only: bool = Field(True, description="Show only published posts")
    search: Optional[str] = Field(None, description="Search in title and summary")


class BlogPostListResponse(BaseModel):
    """Schema for paginated blog post list response"""
    posts: List[BlogPostListResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool
