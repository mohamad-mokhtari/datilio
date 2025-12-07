from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import json
from app.core.db_setup import Base
from app.models.mixins import Timestamp


class BlogPost(Base, Timestamp):
    __tablename__ = "blog_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    summary = Column(Text, nullable=True)
    featured_image_url = Column(String(500), nullable=True)
    content_json = Column(Text, nullable=False)  # JSON string
    author_name = Column(String(100), nullable=False, default="Datilio Team")
    author_email = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True, default="General")
    tags = Column(JSONB, nullable=False, default=lambda: json.dumps([]))
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    view_count = Column(Integer, default=0)
    reading_time_minutes = Column(Integer, default=5)
    meta_description = Column(String(300), nullable=True)
    meta_keywords = Column(String(500), nullable=True)

    def __repr__(self):
        return f"<BlogPost(id={self.id}, title='{self.title}', slug='{self.slug}')>"

    @property
    def content(self):
        """Parse JSON content and return as dict"""
        try:
            if self.content_json:
                parsed_content = json.loads(self.content_json)
                # Ensure the content has the required structure
                if not isinstance(parsed_content, dict):
                    return {"summary": "", "body": []}
                
                # Ensure required fields exist
                if "summary" not in parsed_content:
                    parsed_content["summary"] = ""
                if "body" not in parsed_content:
                    parsed_content["body"] = []
                
                return parsed_content
            else:
                return {"summary": "", "body": []}
        except (json.JSONDecodeError, TypeError):
            return {"summary": "", "body": []}

    @content.setter
    def content(self, value):
        """Set content from dict to JSON string"""
        if isinstance(value, dict):
            self.content_json = json.dumps(value, ensure_ascii=False)
        elif isinstance(value, str):
            self.content_json = value
        else:
            self.content_json = "{}"

    @property
    def tags_list(self):
        """Return tags as a list"""
        if self.tags:
            if isinstance(self.tags, list):
                return self.tags
            elif isinstance(self.tags, str):
                try:
                    return json.loads(self.tags)
                except (json.JSONDecodeError, TypeError):
                    return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
        return []

    @tags_list.setter
    def tags_list(self, value):
        """Set tags from list to JSONB"""
        if isinstance(value, list):
            self.tags = value
        elif isinstance(value, str):
            try:
                self.tags = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                self.tags = [tag.strip() for tag in value.split(',') if tag.strip()]
        else:
            self.tags = []

    def increment_view_count(self):
        """Increment view count"""
        self.view_count = (self.view_count or 0) + 1

    def calculate_reading_time(self):
        """Calculate estimated reading time based on content"""
        if not self.content_json:
            return 1
        
        try:
            content_data = json.loads(self.content_json)
            word_count = 0
            
            # Count words in summary
            if self.summary:
                word_count += len(self.summary.split())
            
            # Count words in body content
            if 'body' in content_data and isinstance(content_data['body'], list):
                for item in content_data['body']:
                    if item.get('type') == 'paragraph' and item.get('text'):
                        word_count += len(item['text'].split())
                    elif item.get('type') == 'heading' and item.get('text'):
                        word_count += len(item['text'].split())
            
            # Average reading speed: 200 words per minute
            reading_time = max(1, round(word_count / 200))
            self.reading_time_minutes = reading_time
            return reading_time
        except (json.JSONDecodeError, TypeError):
            return 5
