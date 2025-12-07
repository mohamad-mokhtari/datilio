import { combineReducers } from '@reduxjs/toolkit'
import listsReducer, { ListsState } from './listsSlice'

const reducer = combineReducers({
    lists: listsReducer,
})

export type ListsRootState = {
    lists: ListsState
}

export default reducer; 