import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_COLLAPSE
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'

const navigationConfig: NavigationTree[] = [
    {
        key: 'dashboard',
        path: '/dashboard',
        title: 'Admin Dashboard',
        translateKey: 'nav.dashboard',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    },
    {
        key: 'userManagement',
        path: '/user-management',
        title: 'User Management',
        translateKey: 'nav.userManagement',
        icon: 'users',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    },
    {
        key: 'feedbackManagement',
        path: '/feedback-management',
        title: 'Feedback Management',
        translateKey: 'nav.feedbackManagement',
        icon: 'messageSquare',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    },
    {
        key: 'usageOverview',
        path: '/usage-overview',
        title: 'Usage Overview',
        translateKey: 'nav.usageOverview',
        icon: 'chartBar',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    },
    {
        key: 'analytics',
        path: '/analytics',
        title: 'Analytics',
        translateKey: 'nav.analytics',
        icon: 'chartPie',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    },
    {
        key: 'blogManagement',
        path: '/blog-management',
        title: 'Blog Management',
        translateKey: 'nav.blogManagement',
        icon: 'documentText',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    },
    {
        key: 'blogAnalytics',
        path: '/blog-analytics',
        title: 'Blog Analytics',
        translateKey: 'nav.blogAnalytics',
        icon: 'chartBar',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin'],
        subMenu: [],
    }
]

export default navigationConfig
