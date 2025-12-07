// Blog content types
export interface BlogContentBlock {
    type: 'heading' | 'paragraph' | 'code' | 'list' | 'quote' | 'image'
    level?: number // for headings
    text?: string
    language?: string // for code blocks
    content?: string // for code blocks
    items?: string[] // for lists
    url?: string // for images
    alt?: string // for images
    caption?: string // for images
    author?: string // for quotes
    style?: 'ordered' | 'unordered' // for lists
}

export interface BlogContent {
    summary: string
    body: BlogContentBlock[]
}

// Blog post types
export interface BlogPost {
    id: string
    title: string
    slug: string
    summary: string
    featured_image_url?: string
    content: BlogContent
    author_name: string
    author_email: string
    category: string
    tags: string[]
    is_published: boolean
    view_count: number
    reading_time_minutes: number
    created_at: string
    updated_at: string
    published_at?: string
    meta_description?: string
    meta_keywords?: string
}

export interface BlogPostCreate {
    title: string
    slug: string
    summary: string
    featured_image_url?: string
    content: BlogContent
    author_name: string
    author_email: string
    category: string
    tags: string[]
    is_published?: boolean
    meta_description?: string
    meta_keywords?: string
}

export interface BlogPostUpdate {
    title?: string
    summary?: string
    featured_image_url?: string
    content?: BlogContent
    category?: string
    tags?: string[]
    is_published?: boolean
    meta_description?: string
    meta_keywords?: string
}

// API response types
export interface BlogPostResponse extends BlogPost {}

export interface BlogListParams {
    page?: number
    page_size?: number
    published_only?: boolean
    category?: string
    search?: string
}

export interface BlogListResponse {
    posts: BlogPost[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export interface BlogActionResponse {
    message: string
    post_id: string
}

// Blog analytics types
export interface BlogAnalytics {
    total_posts: number
    published_posts: number
    draft_posts: number
    total_views: number
    popular_posts: {
        id: string
        title: string
        slug: string
        view_count: number
        published_at: string
    }[]
    posts_by_category: {
        category: string
        count: number
    }[]
    recent_posts: {
        id: string
        title: string
        slug: string
        is_published: boolean
        created_at: string
    }[]
}

// Blog categories
export const BLOG_CATEGORIES = [
    'Tutorials',
    'Data Science',
    'Programming',
    'General',
    'News',
    'Reviews',
    'Case Studies'
] as const

export type BlogCategory = typeof BLOG_CATEGORIES[number]

// Common blog tags
export const COMMON_BLOG_TAGS = [
    'python',
    'fastapi',
    'data-analysis',
    'machine-learning',
    'web-development',
    'tutorial',
    'best-practices',
    'programming',
    'api',
    'database',
    'frontend',
    'backend',
    'devops',
    'security'
] as const
