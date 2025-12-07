import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'

export interface SessionState {
    signedIn: boolean
    token: string | null
}

// Initialize from localStorage if tokens exist
const getInitialState = (): SessionState => {
    const accessToken = localStorage.getItem('access_token')
    return {
        signedIn: !!accessToken,
        token: accessToken,
    }
}

const initialState: SessionState = getInitialState()

const sessionSlice = createSlice({
    name: `${SLICE_BASE_NAME}/session`,
    initialState,
    reducers: {
        signInSuccess(state, action: PayloadAction<string>) {
            state.signedIn = true
            state.token = action.payload
        },
        signOutSuccess(state) {
            state.signedIn = false
            state.token = null
            // Clear tokens from localStorage
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
        },
    },
})

export const { signInSuccess, signOutSuccess } = sessionSlice.actions
export default sessionSlice.reducer
