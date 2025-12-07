export interface AdminStats {
    total_users: number
    active_users: number
    admin_users: number
    disabled_users: number
    verified_users: number
    unverified_users: number
    new_users_this_month: number
    total_logins_today: number
}

export interface UserListParams {
    page?: number
    page_size?: number
    search?: string
    role?: 'admin' | 'user'
    email_verified?: boolean
    disabled?: boolean
}

export interface UserListResponse {
    users: AdminUser[]
    total: number
    page: number
    page_size: number
}

export interface AdminUser {
    id: string
    email: string
    username: string
    first_name?: string
    last_name?: string
    disabled: boolean
    email_verified: boolean
    role: 'admin' | 'user'
}

export interface AdminUserResponse {
    message: string
    user_id: string
}

export interface AdminDashboardData {
    stats: AdminStats
    recent_activity?: AdminActivity[]
    system_status?: SystemStatus
}

export interface AdminActivity {
    id: string
    type: 'user_created' | 'user_updated' | 'user_deleted' | 'user_enabled' | 'user_disabled' | 'role_changed'
    description: string
    user_id: string
    admin_id: string
    timestamp: string
}

export interface SystemStatus {
    database_connected: boolean
    api_version: string
    last_updated: string
    uptime: number
}
