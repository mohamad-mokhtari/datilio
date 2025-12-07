import { combineReducers, CombinedState, AnyAction, Reducer } from 'redux'
import auth, { AuthState } from './slices/auth'
import base, { BaseState } from './slices/base'
import locale, { LocaleState } from './slices/locale/localeSlice'
import theme, { ThemeState } from './slices/theme/themeSlice'
import enumReducer, { EnumRootState } from './slices/enum'
import lists, { ListsRootState } from './slices/lists'
import pricing, { PricingState } from './slices/pricing/pricingSlice'
import RtkQueryService from '@/services/RtkQueryService'

export type RootState = CombinedState<{
    auth: CombinedState<AuthState>
    base: CombinedState<BaseState>
    locale: LocaleState
    theme: ThemeState
    enum: CombinedState<EnumRootState>
    lists: CombinedState<ListsRootState>
    pricing: CombinedState<PricingState>
    syntheticData: any
    /* eslint-disable @typescript-eslint/no-explicit-any */
    [RtkQueryService.reducerPath]: any
}>

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AsyncReducers = Record<string, Reducer<any, AnyAction>>

export interface ExtendedRootState extends RootState {
    [key: string]: any
}

const staticReducers = {
    auth,
    base,
    locale,
    theme,
    enum: enumReducer,
    lists,
    pricing,
    [RtkQueryService.reducerPath]: RtkQueryService.reducer,
}

const rootReducer =
    (asyncReducers?: AsyncReducers) =>
    (state: RootState, action: AnyAction) => {
        const combinedReducer = combineReducers({
            ...staticReducers,
            ...asyncReducers,
        })
        return combinedReducer(state, action)
    }

export default rootReducer
