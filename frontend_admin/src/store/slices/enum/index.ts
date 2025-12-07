import { combineReducers } from '@reduxjs/toolkit'
import enums, { EnumState } from './enumSlice'

const reducer = combineReducers({
    enums,
})

export type EnumRootState = {
    enums: EnumState
}

export * from './enumSlice'
export default reducer
