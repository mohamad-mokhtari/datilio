// export type AppConfig = {
//     baseURL: string
//     apiPrefix: string
//     authenticatedEntryPath: string
//     unAuthenticatedEntryPath: string
//     tourPath: string
//     locale: string
//     enableMock: boolean
// }

// const appConfig: AppConfig = {
//     baseURL: 'http://127.0.0.1:8000',
//     apiPrefix: '/api/v1/',
//     authenticatedEntryPath: '/home',
//     unAuthenticatedEntryPath: '/sign-in',
//     tourPath: '/',
//     locale: 'en',
//     enableMock: true,
// }

// export default appConfig


import { getApiV1BaseUrl } from '@/utils/apiUrl'

export type AppConfig = {
    baseURL: string
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    tourPath: string
    locale: string
    enableMock: boolean
}

const appConfig: AppConfig = {
    baseURL: getApiV1BaseUrl(),
    apiPrefix: '/api',
    authenticatedEntryPath: '/dashboard',
    unAuthenticatedEntryPath: '/sign-in',
    tourPath: '/app/account/kyc-form',
    locale: 'en',
    enableMock: true,
}

export default appConfig
