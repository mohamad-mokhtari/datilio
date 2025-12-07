import { ReactNode } from 'react'

export type SignInCredential = {
    username: string
    password: string
}


export type SignUpCredential = {
    username: string
    email: string
    password: string
}

export type ForgotPassword = {
    email: string
}

export type ResetPassword = {
    password: string
}

export type JwtResponse = {
    access_token: string
    refresh_token: string
}

export type SignInResponse = JwtResponse

export type SignUpResponse = JwtResponse

export type RefreshTokenResponse = JwtResponse

export interface AuthResponse {
    token: string
    refresh_token?: string
    user?: {
        id?: string
        avatar?: string
        userName?: string
        authority?: string[]
        email?: string
    }
}

export type AuthToken = {
    access_token: string
    refresh_token: string
}

export type UserCredential = {
    avatar: string
    userName: string
    email: string
    authority: string[]
}
