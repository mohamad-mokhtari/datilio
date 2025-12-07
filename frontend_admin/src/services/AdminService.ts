import type { AdminUser, AdminUserResponse, UserListParams, UserListResponse } from '@/@types/admin'
import ApiService2 from './ApiService2'

class AdminService {
    private baseUrl = '/admin'

    async getUsers(params: UserListParams = {}): Promise<{ data: UserListResponse }> {
        const queryParams = new URLSearchParams()
        
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.page_size) queryParams.append('page_size', params.page_size.toString())
        if (params.search) queryParams.append('search', params.search)
        if (params.role) queryParams.append('role', params.role)
        if (params.email_verified !== undefined) queryParams.append('email_verified', params.email_verified.toString())
        if (params.disabled !== undefined) queryParams.append('disabled', params.disabled.toString())

        const url = `${this.baseUrl}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
        
        return ApiService2.fetchData<UserListResponse>({
            url,
            method: 'get'
        })
    }

    async getUser(userId: string): Promise<{ data: AdminUser }> {
        return ApiService2.fetchData<AdminUser>({
            url: `${this.baseUrl}/users/${userId}`,
            method: 'get'
        })
    }

    async verifyUserEmail(userId: string): Promise<{ data: AdminUserResponse }> {
        return ApiService2.fetchData<AdminUserResponse>({
            url: `${this.baseUrl}/users/${userId}/verify-email`,
            method: 'put'
        })
    }

    async disableUser(userId: string): Promise<{ data: AdminUserResponse }> {
        return ApiService2.fetchData<AdminUserResponse>({
            url: `${this.baseUrl}/users/${userId}/disable`,
            method: 'put'
        })
    }

    async enableUser(userId: string): Promise<{ data: AdminUserResponse }> {
        return ApiService2.fetchData<AdminUserResponse>({
            url: `${this.baseUrl}/users/${userId}/enable`,
            method: 'put'
        })
    }

    async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<{ data: AdminUserResponse }> {
        return ApiService2.fetchData<AdminUserResponse>({
            url: `${this.baseUrl}/users/${userId}/role?role=${role}`,
            method: 'put'
        })
    }

    async deleteUser(userId: string): Promise<{ data: AdminUserResponse }> {
        return ApiService2.fetchData<AdminUserResponse>({
            url: `${this.baseUrl}/users/${userId}`,
            method: 'delete'
        })
    }
}

export default new AdminService()
