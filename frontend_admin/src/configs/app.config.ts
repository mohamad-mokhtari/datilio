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
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
    apiPrefix: '/api',
    authenticatedEntryPath: '/dashboard',
    unAuthenticatedEntryPath: '/sign-in',
    tourPath: '/app/account/kyc-form',
    locale: 'en',
    enableMock: true,
}

export default appConfig
