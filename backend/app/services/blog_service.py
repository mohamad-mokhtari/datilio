from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Tuple
from uuid import UUID
import re
from datetime import datetime

from app.models.blog_model import BlogPost
from app.schemas.blog_schemas import (
    BlogPostCreate, 
    BlogPostUpdate, 
    BlogPostListQuery,
    BlogPostListResponse as BlogListResponse
)


class BlogService:
    """Service class for blog operations"""

    @staticmethod
    def create_blog_post(db: Session, blog_data: BlogPostCreate) -> BlogPost:
        """Create a new blog post"""
        # Check if slug already exists
        existing_post = db.query(BlogPost).filter(BlogPost.slug == blog_data.slug).first()
        if existing_post:
            raise ValueError(f"Blog post with slug '{blog_data.slug}' already exists")

        # Create new blog post
        db_blog = BlogPost(
            title=blog_data.title,
            slug=blog_data.slug,
            summary=blog_data.summary,
            featured_image_url=blog_data.featured_image_url,
            author_name=blog_data.author_name,
            author_email=blog_data.author_email,
            category=blog_data.category,
            tags_list=blog_data.tags or [],
            is_published=blog_data.is_published,
            meta_description=blog_data.meta_description,
            meta_keywords=blog_data.meta_keywords
        )
        
        # Set content after creation to ensure proper handling
        db_blog.content = blog_data.content.dict() if blog_data.content else {"summary": "", "body": []}

        # Calculate reading time
        db_blog.calculate_reading_time()

        # Set published_at if publishing
        if blog_data.is_published:
            db_blog.published_at = datetime.utcnow()

        db.add(db_blog)
        db.commit()
        db.refresh(db_blog)
        return db_blog

    @staticmethod
    def get_blog_post(db: Session, post_id: UUID) -> Optional[BlogPost]:
        """Get a blog post by ID"""
        return db.query(BlogPost).filter(BlogPost.id == post_id).first()

    @staticmethod
    def get_blog_post_by_slug(db: Session, slug: str, published_only: bool = True) -> Optional[BlogPost]:
        """Get a blog post by slug"""
        query = db.query(BlogPost).filter(BlogPost.slug == slug)
        
        if published_only:
            query = query.filter(BlogPost.is_published == True)
        
        return query.first()

    @staticmethod
    def get_blog_posts(
        db: Session, 
        query_params: BlogPostListQuery
    ) -> Tuple[List[BlogPost], int]:
        """Get paginated list of blog posts"""
        # Base query
        query = db.query(BlogPost)

        # Apply filters
        if query_params.published_only:
            query = query.filter(BlogPost.is_published == True)

        if query_params.category:
            query = query.filter(BlogPost.category == query_params.category)

        if query_params.tag:
            # For JSONB tags, we need to use a different approach
            query = query.filter(BlogPost.tags.contains([query_params.tag]))

        if query_params.search:
            search_term = f"%{query_params.search}%"
            query = query.filter(
                or_(
                    BlogPost.title.ilike(search_term),
                    BlogPost.summary.ilike(search_term)
                )
            )

        # Get total count
        total = query.count()

        # Apply ordering and pagination
        query = query.order_by(desc(BlogPost.published_at), desc(BlogPost.created_at))
        
        offset = (query_params.page - 1) * query_params.limit
        posts = query.offset(offset).limit(query_params.limit).all()

        return posts, total

    @staticmethod
    def update_blog_post(db: Session, post_id: UUID, update_data: BlogPostUpdate) -> Optional[BlogPost]:
        """Update a blog post"""
        db_blog = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not db_blog:
            return None

        # Check slug uniqueness if slug is being updated
        if update_data.slug and update_data.slug != db_blog.slug:
            existing_post = db.query(BlogPost).filter(
                and_(BlogPost.slug == update_data.slug, BlogPost.id != post_id)
            ).first()
            if existing_post:
                raise ValueError(f"Blog post with slug '{update_data.slug}' already exists")

        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        
        for field, value in update_dict.items():
            if field == 'content' and value is not None:
                # Handle content properly by converting to dict
                if hasattr(value, 'dict'):
                    db_blog.content = value.dict()
                else:
                    db_blog.content = value
            elif field == 'tags' and value is not None:
                db_blog.tags_list = value
            else:
                setattr(db_blog, field, value)

        # Recalculate reading time if content was updated
        if 'content' in update_dict:
            db_blog.calculate_reading_time()

        # Update published_at if publishing for the first time
        if update_data.is_published and not db_blog.published_at:
            db_blog.published_at = datetime.utcnow()

        db.commit()
        db.refresh(db_blog)
        return db_blog

    @staticmethod
    def delete_blog_post(db: Session, post_id: UUID) -> bool:
        """Delete a blog post"""
        db_blog = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not db_blog:
            return False

        db.delete(db_blog)
        db.commit()
        return True

    @staticmethod
    def increment_view_count(db: Session, post_id: UUID) -> Optional[BlogPost]:
        """Increment view count for a blog post"""
        db_blog = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not db_blog:
            return None

        db_blog.increment_view_count()
        db.commit()
        db.refresh(db_blog)
        return db_blog

    @staticmethod
    def get_categories(db: Session) -> List[str]:
        """Get all unique categories"""
        categories = db.query(BlogPost.category).filter(
            BlogPost.is_published == True,
            BlogPost.category.isnot(None)
        ).distinct().all()
        return [cat[0] for cat in categories if cat[0]]

    @staticmethod
    def get_tags(db: Session) -> List[str]:
        """Get all unique tags"""
        posts = db.query(BlogPost.tags).filter(
            BlogPost.is_published == True,
            BlogPost.tags.isnot(None)
        ).all()
        
        all_tags = set()
        for post in posts:
            if post[0]:
                tags = [tag.strip() for tag in post[0].split(',') if tag.strip()]
                all_tags.update(tags)
        
        return sorted(list(all_tags))

    @staticmethod
    def get_related_posts(db: Session, post_id: UUID, limit: int = 3) -> List[BlogPost]:
        """Get related posts based on category and tags"""
        current_post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not current_post:
            return []

        # Find posts with same category
        related = db.query(BlogPost).filter(
            and_(
                BlogPost.id != post_id,
                BlogPost.is_published == True,
                BlogPost.category == current_post.category
            )
        ).limit(limit).all()

        # If not enough posts with same category, add posts with similar tags
        if len(related) < limit:
            remaining = limit - len(related)
            related_ids = [p.id for p in related]
            
            if current_post.tags:
                tag_posts = db.query(BlogPost).filter(
                    and_(
                        BlogPost.id != post_id,
                        BlogPost.is_published == True,
                        BlogPost.id.notin_(related_ids)
                    )
                ).all()
                
                # Simple tag matching
                for post in tag_posts:
                    if post.tags and any(tag in current_post.tags for tag in post.tags.split(',')):
                        related.append(post)
                        if len(related) >= limit:
                            break

        return related[:limit]

    @staticmethod
    def generate_slug(title: str) -> str:
        """Generate a URL-friendly slug from title"""
        # Convert to lowercase and replace spaces with hyphens
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')

    @staticmethod
    def get_popular_posts(db: Session, limit: int = 5) -> List[BlogPost]:
        """Get most viewed blog posts"""
        return db.query(BlogPost).filter(
            BlogPost.is_published == True
        ).order_by(desc(BlogPost.view_count)).limit(limit).all()

    @staticmethod
    def get_recent_posts(db: Session, limit: int = 5) -> List[BlogPost]:
        """Get most recent blog posts"""
        return db.query(BlogPost).filter(
            BlogPost.is_published == True
        ).order_by(desc(BlogPost.published_at)).limit(limit).all()
