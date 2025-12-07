export interface UsageByFeature {
    feature: string
    total_amount: number
    usage_count: number
    unique_users: number
    last_used?: string
}

export interface RecentActivity {
    date: string
    daily_usage: number
}

export interface TopUser {
    email: string
    total_usage: number
}

export interface UsageOverview {
    total_users: number
    active_users: number
    usage_by_feature: UsageByFeature[]
    recent_activity: RecentActivity[]
    top_users: TopUser[]
}

export interface UserInfo {
    id: string
    email: string
    username: string
    created_at: string
    last_login: string
}

export interface UserUsageByFeature {
    feature: string
    total_amount: number
    usage_count: number
    last_used: string
}

export interface UserActivity {
    id: string
    feature: string
    amount: number
    timestamp: string
    description: string
}

export interface UserUsageDetails {
    user: UserInfo
    usage_by_feature: UserUsageByFeature[]
    recent_activity: UserActivity[]
}

export interface DailyTrend {
    date: string
    total_amount: number
    usage_count: number
    unique_users: number
}

export interface FeatureBreakdown {
    feature: string
    total_amount: number
    usage_count: number
    unique_users: number
}

export interface UserEngagement {
    date: string
    active_users: number
}

export interface UsageAnalytics {
    daily_trends: DailyTrend[]
    feature_breakdown: FeatureBreakdown[]
    user_engagement: UserEngagement[]
}

export interface AnalyticsParams {
    start_date?: string
    end_date?: string
    feature?: string
}

export interface UsageStats {
    total_usage: number
    average_usage: number
    peak_usage: number
    growth_rate: number
}
