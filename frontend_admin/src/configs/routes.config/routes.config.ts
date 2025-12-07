import { lazy } from 'react'
import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes = [
    {
        key: 'dashboard',
        path: '/dashboard',
        component: lazy(() => import('@/views/Home')),
        authority: ['admin'],
    },
    {
        key: 'userManagement',
        path: '/user-management',
        component: lazy(() => import('@/views/admin/UserManagement')),
        authority: ['admin'],
    },
    {
        key: 'feedbackManagement',
        path: '/feedback-management',
        component: lazy(() => import('@/views/admin/FeedbackManagement')),
        authority: ['admin'],
    },
    {
        key: 'usageOverview',
        path: '/usage-overview',
        component: lazy(() => import('@/views/admin/UsageOverview')),
        authority: ['admin'],
    },
    {
        key: 'analytics',
        path: '/analytics',
        component: lazy(() => import('@/views/admin/Analytics')),
        authority: ['admin'],
    },
    {
        key: 'blogManagement',
        path: '/blog-management',
        component: lazy(() => import('@/views/admin/BlogManagement')),
        authority: ['admin'],
    },
    {
        key: 'blogAnalytics',
        path: '/blog-analytics',
        component: lazy(() => import('@/views/admin/BlogAnalytics')),
        authority: ['admin'],
    },
    {
        key: 'userUsageDetails',
        path: '/user-usage/:userId',
        component: lazy(() => import('@/views/admin/UserUsageDetails')),
        authority: ['admin'],
    },
]