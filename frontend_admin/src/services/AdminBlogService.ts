import ApiService2, { FetchResponse } from './BaseService2'
import { 
    BlogPost, 
    BlogPostCreate, 
    BlogPostUpdate, 
    BlogPostResponse, 
    BlogListParams, 
    BlogListResponse,
    BlogActionResponse,
    BlogAnalytics
} from '@/@types/blog'

class AdminBlogService {
    private baseUrl = '/admin/blog'

    /**
     * Get all blog posts with filtering and pagination
     */
    async getBlogPosts(params: BlogListParams = {}): Promise<FetchResponse<BlogListResponse | BlogPost[]>> {
        const queryParams = new URLSearchParams()
        
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.page_size) queryParams.append('page_size', params.page_size.toString())
        if (params.published_only !== undefined) queryParams.append('published_only', params.published_only.toString())
        if (params.category) queryParams.append('category', params.category)
        if (params.search) queryParams.append('search', params.search)

        const url = queryParams.toString() 
            ? `${this.baseUrl}/posts?${queryParams.toString()}`
            : `${this.baseUrl}/posts`

        return ApiService2.get<BlogListResponse>(url)
    }

    /**
     * Get a single blog post by ID
     */
    async getBlogPost(postId: string): Promise<FetchResponse<BlogPostResponse>> {
        return ApiService2.get<BlogPostResponse>(`${this.baseUrl}/posts/${postId}`)
    }

    /**
     * Create a new blog post
     */
    async createBlogPost(postData: BlogPostCreate): Promise<FetchResponse<BlogPostResponse>> {
        return ApiService2.post<BlogPostResponse>(`${this.baseUrl}/posts`, postData)
    }

    /**
     * Update an existing blog post
     */
    async updateBlogPost(postId: string, postData: BlogPostUpdate): Promise<FetchResponse<BlogPostResponse>> {
        return ApiService2.put<BlogPostResponse>(`${this.baseUrl}/posts/${postId}`, postData)
    }

    /**
     * Publish a blog post
     */
    async publishBlogPost(postId: string): Promise<FetchResponse<BlogActionResponse>> {
        return ApiService2.post<BlogActionResponse>(`${this.baseUrl}/posts/${postId}/publish`)
    }

    /**
     * Unpublish a blog post
     */
    async unpublishBlogPost(postId: string): Promise<FetchResponse<BlogActionResponse>> {
        return ApiService2.post<BlogActionResponse>(`${this.baseUrl}/posts/${postId}/unpublish`)
    }

    /**
     * Delete a blog post
     */
    async deleteBlogPost(postId: string): Promise<FetchResponse<BlogActionResponse>> {
        return ApiService2.delete<BlogActionResponse>(`${this.baseUrl}/posts/${postId}`)
    }

    /**
     * Upload a blog image
     */
    async uploadBlogImage(imageFile: File): Promise<FetchResponse<{
        message: string
        filename: string
        url: string
        size: number
        content_type: string
    }>> {
        const formData = new FormData()
        formData.append('image_file', imageFile)

        return ApiService2.post<{
            message: string
            filename: string
            url: string
            size: number
            content_type: string
        }>(`${this.baseUrl}/upload-image`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    }

    /**
     * Get blog analytics and statistics
     */
    async getBlogAnalytics(): Promise<FetchResponse<BlogAnalytics>> {
        return ApiService2.get<BlogAnalytics>(`${this.baseUrl}/analytics`)
    }
}

export default new AdminBlogService()
