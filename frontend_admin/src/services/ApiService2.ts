import BaseService2 from './BaseService2';
import type { FetchOptions, FetchResponse } from './BaseService2';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

const ApiService2 = {
    /**
     * Generic method to fetch data from the API
     * @param param Request configuration options
     * @returns Promise with the response
     */
    async fetchData<Response = unknown>(
        param: {
            url: string;
            method?: HttpMethod;
            data?: any;
            headers?: Record<string, string>;
            timeout?: number;
        } & FetchOptions // Merge additional FetchOptions
    ): Promise<FetchResponse<Response>> {
        const { url, method = 'get', data, ...rest } = param;
        try {
            switch (method) {
                case 'post':
                    return await BaseService2.post<Response>(url, data, rest);
                case 'put':
                    return await BaseService2.put<Response>(url, data, rest);
                case 'delete':
                    return await BaseService2.delete<Response>(url, rest);
                case 'patch':
                    return await BaseService2.patch<Response>(url, data, rest);
                case 'get':
                default:
                    return await BaseService2.get<Response>(url, rest);
            }
        } catch (error) {
            throw error;
        }
    },

    /**
     * Helper methods for each HTTP request type
     */
    async get<Response = unknown>(url: string, options?: FetchOptions): Promise<FetchResponse<Response>> {
        return this.fetchData<Response>({ url, method: 'get' as HttpMethod, ...options });
    },

    async post<Response = unknown>(url: string, data?: any, options?: FetchOptions): Promise<FetchResponse<Response>> {
        return this.fetchData<Response>({ url, method: 'post' as HttpMethod, data, ...options });
    },

    async put<Response = unknown>(url: string, data?: any, options?: FetchOptions): Promise<FetchResponse<Response>> {
        return this.fetchData<Response>({ url, method: 'put' as HttpMethod, data, ...options });
    },

    async delete<Response = unknown>(url: string, options?: FetchOptions): Promise<FetchResponse<Response>> {
        return this.fetchData<Response>({ url, method: 'delete' as HttpMethod, ...options });
    },

    async patch<Response = unknown>(url: string, data?: any, options?: FetchOptions): Promise<FetchResponse<Response>> {
        return this.fetchData<Response>({ url, method: 'patch' as HttpMethod, data, ...options });
    },
};

export default ApiService2;
