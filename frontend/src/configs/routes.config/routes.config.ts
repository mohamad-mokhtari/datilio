import { lazy } from 'react'
import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'
import { FEATURES } from '@/configs/version.config'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes = [
    {
        key: 'dashboard',
        path: '/dashboard',
        component: lazy(() => import('@/views/Home')),
        authority: [],
    },
    /** Example purpose only, please remove */
    {
        key: 'singleMenuItem',
        path: '/single-menu-view',
        component: lazy(() => import('@/views/demo/SingleMenuView')),
        authority: [],
    },
    {
        key: 'uploadData',
        path: '/upload-data',
        component: lazy(() => import('@/views/data/UploadData')),
        authority: [],
    },
    {
        key: 'showData',
        path: '/show-data',
        component: lazy(() => import('@/views/data/ShowData')),
        authority: [],
    },
    {
        key: 'ruleCenter',
        path: '/rule-center',
        component: lazy(() => import('@/views/data/RuleCenter')),
        authority: [],
    },
    {
        key: 'talkToData',
        path: '/talk-to-data',
        component: lazy(() => import('@/views/data/TalkToData')),
        authority: [],
    },
    {
        key: 'userLists',
        path: '/user-lists',
        component: lazy(() => import('@/views/lists/ListsPage')),
        authority: [],
    },
    {
        key: 'collapseMenu.item1',
        path: '/collapse-menu-item-view-1',
        component: lazy(() => import('@/views/demo/CollapseMenuItemView1')),
        authority: [],
    },
    {
        key: 'collapseMenu.item2',
        path: '/collapse-menu-item-view-2',
        component: lazy(() => import('@/views/demo/CollapseMenuItemView2')),
        authority: [],
    },
    {
        key: 'groupMenu.single',
        path: '/group-single-menu-item-view',
        component: lazy(() =>
            import('@/views/demo/GroupSingleMenuItemView')
        ),
        authority: [],
    },
    {
        key: 'groupMenu.collapse.item1',
        path: '/group-collapse-menu-item-view-1',
        component: lazy(() =>
            import('@/views/demo/GroupCollapseMenuItemView1')
        ),
        authority: [],
    },
    {
        key: 'groupMenu.collapse.item2',
        path: '/group-collapse-menu-item-view-2',
        component: lazy(() =>
            import('@/views/demo/GroupCollapseMenuItemView2')
        ),
        authority: [],
    },
    {
        key: 'generateSyntheticData',
        path: '/generate-synthetic-data',
        component: lazy(() => import('@/views/data/SyntheticDataGenerator')),
        authority: [],
    },
    {
        key: 'pricing',
        path: '/pricing',
        component: lazy(() => import('@/views/pricing/PricingPage')),
        authority: [],
    },
    {
        key: 'billing',
        path: '/billing',
        component: lazy(() => import('@/views/pricing/BillingDashboard')),
        authority: [],
    },
    {
        key: 'paymentSuccess',
        path: '/pricing/success',
        component: lazy(() => import('@/views/pricing/PaymentSuccessPage')),
        authority: [],
    },
    {
        key: 'paymentCancel',
        path: '/pricing/cancel',
        component: lazy(() => import('@/views/pricing/PaymentCancelPage')),
        authority: [],
    },
    {
        key: 'feedback',
        path: '/feedback',
        component: lazy(() => import('@/views/feedback/FeedbackPage')),
        authority: [],
    },
    {
        key: 'preprocessing',
        path: '/preprocessing',
        component: lazy(() => import('@/views/data/PreprocessingLandingPage')),
        authority: [],
    },
    {
        key: 'preprocessingFile',
        path: '/preprocessing/:fileId',
        component: lazy(() => import('@/components/preprocessing/PreprocessingPage')),
        authority: [],
    },
    {
        key: 'mlModels',
        path: '/ml-models',
        component: FEATURES.ML_MODELS_ENABLED 
            ? lazy(() => import('@/views/ml/MLModelsPage'))
            : lazy(() => import('@/views/shared/MLModelsComingSoon')),
        authority: [],
    },
    {
        key: 'mlCreateModel',
        path: '/ml-models/create',
        component: FEATURES.ML_MODELS_ENABLED
            ? lazy(() => import('@/views/ml/CreateModelWizard'))
            : lazy(() => import('@/views/shared/MLModelsComingSoon')),
        authority: [],
    },
    {
        key: 'mlModelDetails',
        path: '/ml-models/:modelId',
        component: FEATURES.ML_MODELS_ENABLED
            ? lazy(() => import('@/views/ml/ModelDetailsPage'))
            : lazy(() => import('@/views/shared/MLModelsComingSoon')),
        authority: [],
    },
    {
        key: 'postProcessing',
        path: '/post-processing',
        component: lazy(() => import('@/views/shared/PostProcessingComingSoon')),
        authority: [],
    },
]