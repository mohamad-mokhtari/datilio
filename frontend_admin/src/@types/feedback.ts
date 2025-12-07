export interface FeedbackMessage {
    id: string
    feedback_id: string
    user_id: string
    message: string
    is_admin_message: boolean
    image_path?: string
    created_at: string
    updated_at: string
    user_email: string
}

export interface FeedbackMessageCreate {
    message: string
    image_file?: File
}

export interface FeedbackMessageResponse {
    id: string
    feedback_id: string
    user_id: string
    message: string
    is_admin_message: boolean
    image_path?: string
    created_at: string
    updated_at: string
    user_email: string
}

export interface FeedbackListResponse {
    id: string
    title: string
    message: string
    feedback_type: 'bug' | 'feature' | 'general' | 'ui'
    status: 'open' | 'closed'
    closed_at?: string
    created_at: string
    user_email: string
    message_count: number
}

export interface FeedbackResponse {
    id: string
    user_id: string
    title: string
    message: string
    feedback_type: 'bug' | 'feature' | 'general' | 'ui'
    status: 'open' | 'closed'
    closed_at?: string
    closed_by?: string
    image_path?: string
    created_at: string
    updated_at: string
    user_email: string
    closed_by_email?: string
    messages: FeedbackMessage[]
}

export interface FeedbackListParams {
    page?: number
    page_size?: number
    status?: 'open' | 'closed' | ''
    feedback_type?: 'bug' | 'feature' | 'general' | 'ui' | ''
    user_id?: string
}

export interface FeedbackStats {
    total_feedback: number
    open_feedback: number
    closed_feedback: number
    bug_reports: number
    feature_requests: number
    general_feedback: number
    ui_feedback: number
    recent_feedback: number
}