import ApiService2 from './BaseService2'
import { 
    FeedbackListResponse, 
    FeedbackResponse, 
    FeedbackMessageResponse, 
    FeedbackListParams,
    FeedbackMessageCreate
} from '@/@types/feedback'

class AdminFeedbackService {
    private baseUrl = '/admin/feedback'

    async getFeedbackList(params: FeedbackListParams = {}) {
        const queryParams = new URLSearchParams()
        
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.page_size) queryParams.append('page_size', params.page_size.toString())
        if (params.status) queryParams.append('status', params.status)
        if (params.feedback_type) queryParams.append('feedback_type', params.feedback_type)
        if (params.user_id) queryParams.append('user_id', params.user_id)

        const url = queryParams.toString() 
            ? `${this.baseUrl}?${queryParams.toString()}`
            : this.baseUrl

        return ApiService2.get<FeedbackListResponse[]>(url)
    }

    async getFeedbackById(feedbackId: string) {
        return ApiService2.get<FeedbackResponse>(`${this.baseUrl}/${feedbackId}`)
    }

    async addMessage(feedbackId: string, messageData: FeedbackMessageCreate) {
        const formData = new FormData()
        formData.append('message', messageData.message)
        
        if (messageData.image_file) {
            formData.append('image_file', messageData.image_file)
        }

        return ApiService2.post<FeedbackMessageResponse>(`${this.baseUrl}/${feedbackId}/messages`, formData)
    }

    async closeFeedback(feedbackId: string) {
        return ApiService2.post<{ message: string }>(`${this.baseUrl}/${feedbackId}/close`)
    }

    async reopenFeedback(feedbackId: string) {
        return ApiService2.post<{ message: string }>(`${this.baseUrl}/${feedbackId}/reopen`)
    }

    async deleteFeedback(feedbackId: string) {
        return ApiService2.delete<{ message: string }>(`${this.baseUrl}/${feedbackId}`)
    }

    async uploadImage(feedbackId: string, imageFile: File) {
        const formData = new FormData()
        formData.append('image_file', imageFile)

        return ApiService2.post<{
            message: string
            image_path: string
            image_url: string
        }>(`${this.baseUrl}/${feedbackId}/upload-image`, formData)
    }
}

export default new AdminFeedbackService()
