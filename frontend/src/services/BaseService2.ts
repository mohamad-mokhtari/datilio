import appConfig from '@/configs/app.config'
import { TOKEN_TYPE, REQUEST_HEADER_AUTH_KEY } from '@/constants/api.constant'
import { PERSIST_STORE_NAME } from '@/constants/app.constant'
import deepParseJson from '@/utils/deepParseJson'
import store, { signOutSuccess } from '../store'

const unauthorizedCode = [401]
// const baseURL = `${appConfig.apiPrefix}`
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const defaultTimeout = 60000 // 60 seconds

export interface FetchOptions extends RequestInit {
    timeout?: number;
}

export interface FetchResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    config: FetchOptions;
    ok: boolean;
}

/**
 * Creates a fetch request with interceptor-like behavior
 */
const BaseService2 = {
    async request<T = any>(endpoint: string, options: FetchOptions = {}): Promise<FetchResponse<T>> {
        // Set default options
        const defaultOptions: FetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            timeout: defaultTimeout,
        };

        // Merge options
        const fetchOptions: FetchOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        // Remove Content-Type if the body is FormData
        if (options.body instanceof FormData) {
            fetchOptions.headers = {
                ...(fetchOptions.headers as Record<string, string>),
            };
            delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
        }

        // Add auth token to request (like axios interceptor)
        const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME)
        const persistData = deepParseJson(rawPersistData)

        let accessToken = (persistData as any).auth?.session?.token

        if (!accessToken) {
            const { auth } = store.getState()
            accessToken = auth.session?.token
        }

        if (accessToken) {
            fetchOptions.headers = {
                ...fetchOptions.headers,
                [REQUEST_HEADER_AUTH_KEY]: `${TOKEN_TYPE}${accessToken}`
            }
        }

        // Create full URL
        const url = `${baseURL}${endpoint}`

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
                clearTimeout(timeoutId)
                reject(new Error(`Request timed out after ${fetchOptions.timeout}ms`))
            }, fetchOptions.timeout)
        })

        try {
            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url, fetchOptions),
                timeoutPromise
            ]) as Response

            // Parse response data
            let data: T

            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                data = await response.json()
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text() as unknown as T
            } else {
                // For other types (like blobs, etc)
                data = await response.blob() as unknown as T
            }

            // Create response object similar to axios
            const fetchResponse: FetchResponse<T> = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config: fetchOptions,
                ok: response.ok
            }

            // Handle unauthorized responses (like axios interceptor)
            if (unauthorizedCode.includes(response.status)) {
                store.dispatch(signOutSuccess())
                throw new Error('Unauthorized access')
            }

            // Check for error responses
            if (!response.ok) {
                // Create a proper error object with extracted message
                let errorMessage = 'Request failed';
                
                // Handle different error response formats
                if ((data as any)?.error_code && (data as any)?.message) {
                    // New format: {error_code: "INVALID_FILE_TYPE", message: "...", extra: {...}}
                    const errorData = data as any;
                    errorMessage = JSON.stringify({
                        error_code: errorData.error_code,
                        message: errorData.message,
                        extra: errorData.extra
                    });
                } else if ((data as any)?.detail) {
                    // Legacy format: {detail: "message"}
                    if (typeof (data as any).detail === 'object' && (data as any).detail?.message) {
                        errorMessage = (data as any).detail.message;
                    } else if (typeof (data as any).detail === 'string') {
                        errorMessage = (data as any).detail;
                    }
                } else if ((data as any)?.message) {
                    // Simple format: {message: "..."}
                    errorMessage = (data as any).message;
                } else {
                    // Fallback to status text
                    errorMessage = response.statusText || 'Request failed';
                }

                const error = new Error(errorMessage);

                // Attach response data to error for debugging
                ; (error as any).response = fetchResponse
                    ; (error as any).status = response.status
                    ; (error as any).data = data

                throw error
            }

            return fetchResponse
        } catch (error) {
            // Handle different types of errors
            if (error instanceof Error) {
                // If it's already an Error object (from our error handling above), rethrow it
                throw error
            } else if (typeof error === 'object' && error !== null) {
                // If it's an object but not an Error, try to extract a message
                const errorMessage = (error as any).message || (error as any).detail || 'Request failed'
                throw new Error(errorMessage)
            } else {
                // For any other type, convert to string
                throw new Error(String(error))
            }
        }
    },

    // Helper methods to use the main request function
    async get<T = any>(endpoint: string, options: FetchOptions = {}): Promise<FetchResponse<T>> {
        return this.request<T>(endpoint, { ...options, method: 'GET' })
    },

    async post<T = any>(endpoint: string, data?: any, options: FetchOptions = {}): Promise<FetchResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data instanceof FormData || data instanceof URLSearchParams ? data : JSON.stringify(data),
            headers: {
                ...((!(data instanceof FormData) && !(data instanceof URLSearchParams)) ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers
            }
        })
    },

    async put<T = any>(endpoint: string, data?: any, options: FetchOptions = {}): Promise<FetchResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data instanceof FormData || data instanceof URLSearchParams ? data : JSON.stringify(data),
            headers: {
                ...((!(data instanceof FormData) && !(data instanceof URLSearchParams)) ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers
            }
        })
    },

    async patch<T = any>(endpoint: string, data?: any, options: FetchOptions = {}): Promise<FetchResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data instanceof FormData || data instanceof URLSearchParams ? data : JSON.stringify(data),
            headers: {
                ...((!(data instanceof FormData) && !(data instanceof URLSearchParams)) ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers
            }
        })
    },

    async delete<T = any>(endpoint: string, options: FetchOptions = {}): Promise<FetchResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'DELETE'
        })
    }
}

export default BaseService2
