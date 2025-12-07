import type {
    SignInCredential,
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
    RefreshTokenResponse,
} from '@/@types/auth'
import ApiService2 from './ApiService2'
import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios'

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

// Token storage functions
export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

export const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// Flag to prevent multiple refresh attempts
let isRefreshing = false
// Queue of requests to retry after token refresh
let refreshSubscribers: Array<(token: string) => void> = []

// Function to process the queue of failed requests
const processQueue = (token: string) => {
    refreshSubscribers.forEach(callback => callback(token))
    refreshSubscribers = []
}

// Function to refresh token
export async function refreshToken() {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
        return Promise.reject('No refresh token available')
    }
    
    try {
        const response = await ApiService2.fetchData<RefreshTokenResponse>({
            url: '/auth/refresh',
            method: 'post',
            data: { refresh_token: refreshToken },
        })
        
        if (response.data) {
            setTokens(response.data.access_token, response.data.refresh_token)
            return response.data
        }
        return Promise.reject('Failed to refresh token')
    } catch (error) {
        clearTokens()
        return Promise.reject(error)
    }
}

// Setup the authorization header for all requests
export const setupAuthInterceptor = () => {
    // Request interceptor
    axios.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = getAccessToken()
            if (token && config.headers) {
                config.headers['Authorization'] = `Bearer ${token}`
            }
            return config
        },
        (error: unknown) => {
            return Promise.reject(error)
        }
    )
    
    // Response interceptor
    axios.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
            
            // If error is 401 and not already retrying
            if (error.response?.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    // If already refreshing, add to queue
                    return new Promise((resolve) => {
                        refreshSubscribers.push((token: string) => {
                            if (originalRequest.headers) {
                                originalRequest.headers['Authorization'] = `Bearer ${token}`
                            }
                            resolve(axios(originalRequest))
                        })
                    })
                }
                
                originalRequest._retry = true
                isRefreshing = true
                
                try {
                    // Try to refresh the token
                    const tokens = await refreshToken()
                    // Process queue with new token
                    processQueue(tokens.access_token)
                    // Update the authorization header
                    if (originalRequest.headers) {
                        originalRequest.headers['Authorization'] = `Bearer ${tokens.access_token}`
                    }
                    isRefreshing = false
                    // Retry the original request
                    return axios(originalRequest)
                } catch (refreshError) {
                    isRefreshing = false
                    // If refresh fails, redirect to login
                    clearTokens()
                    window.location.href = '/sign-in'
                    return Promise.reject(refreshError)
                }
            }
            
            return Promise.reject(error)
        }
    )
}

export async function apiSignIn(data: SignInCredential) {
    // Convert data object to URLSearchParams for form data submission
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    return ApiService2.fetchData<SignInResponse>({
        url: '/auth/login',
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
}

export async function apiSignUp(data: SignUpCredential) {
    return ApiService2.fetchData<SignUpResponse>({
        url: '/user/create',
        method: 'post',
        data,
    })
}

export async function apiSignOut() {
    clearTokens()
    return Promise.resolve()
}

export async function apiForgotPassword(data: ForgotPassword) {
    return ApiService2.fetchData({
        url: '/forgot-password',
        method: 'post',
        data,
    })
}

export async function apiResetPassword(data: ResetPassword) {
    return ApiService2.fetchData({
        url: '/reset-password',
        method: 'post',
        data,
    })
}
