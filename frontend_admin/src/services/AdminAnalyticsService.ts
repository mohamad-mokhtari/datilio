import ApiService2 from './BaseService2'
import { 
    UsageOverview, 
    UserUsageDetails, 
    UsageAnalytics, 
    AnalyticsParams
} from '@/@types/analytics'

class AdminAnalyticsService {
    private baseUrl = '/admin/usage'

    async getUsageOverview() {
        return ApiService2.get<UsageOverview>(`${this.baseUrl}/overview`)
    }

    async getUserUsageDetails(userId: string) {
        return ApiService2.get<UserUsageDetails>(`${this.baseUrl}/user/${userId}`)
    }

    async getUsageAnalytics(params: AnalyticsParams = {}) {
        const queryParams = new URLSearchParams()
        
        if (params.start_date) queryParams.append('start_date', params.start_date)
        if (params.end_date) queryParams.append('end_date', params.end_date)
        if (params.feature) queryParams.append('feature', params.feature)

        const url = queryParams.toString() 
            ? `${this.baseUrl}/analytics?${queryParams.toString()}`
            : `${this.baseUrl}/analytics`

        return ApiService2.get<UsageAnalytics>(url)
    }
}

export default new AdminAnalyticsService()
