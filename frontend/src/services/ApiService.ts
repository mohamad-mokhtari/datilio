import BaseService from './BaseService'
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

const ApiService = {
    async fetchData<Response = unknown, Request = Record<string, unknown>>(
        param: AxiosRequestConfig<Request>
    ): Promise<AxiosResponse<Response>> {
        try {
            const response = await BaseService(param);
            return response;
        } catch (error) {
            throw error;  // Ensure errors propagate correctly
        }
    },
};

export default ApiService;


