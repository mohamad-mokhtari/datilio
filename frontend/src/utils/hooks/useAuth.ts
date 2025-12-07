import { apiSignIn, apiSignOut, apiSignUp, setTokens, clearTokens } from '@/services/AuthService'
import {
    setUser,
    signInSuccess,
    signOutSuccess,
    useAppSelector,
    useAppDispatch,
} from '@/store'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useNavigate } from 'react-router-dom'
import useQuery from './useQuery'
import type { SignInCredential, SignUpCredential } from '@/@types/auth'
import { fetchAllLists, clearLists } from '@/store/slices/lists/listsSlice'
import { fetchAllEnums } from '@/store/slices/enum/enumSlice'

type Status = 'success' | 'failed'

function useAuth() {
    const dispatch = useAppDispatch()

    const navigate = useNavigate()

    const query = useQuery()

    const { token, signedIn } = useAppSelector((state) => state.auth.session)

    const signIn = async (
        values: SignInCredential
    ): Promise<
        | {
              status: Status
              message: string
          }
        | undefined
    > => {
        try {
            const resp = await apiSignIn(values)
            if (resp.data) {
                const { access_token, refresh_token } = resp.data
                
                // Store tokens in localStorage
                setTokens(access_token, refresh_token)
                
                // Update Redux state
                dispatch(signInSuccess(access_token))
                
                // Set default user info since the API doesn't return user details
                dispatch(
                    setUser({
                        avatar: '',
                        userName: values.username,
                        authority: ['USER'],
                        email: values.username, // Using username as email since it should be an email
                    })
                )
                
                // Load all necessary data after successful login
                dispatch(fetchAllLists())
                dispatch(fetchAllEnums())
                
                const redirectUrl = query.get(REDIRECT_URL_KEY)
                navigate(
                    redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath
                )
                return {
                    status: 'success',
                    message: '',
                }
            }
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }

    const signUp = async (values: SignUpCredential) => {
        try {
            const resp = await apiSignUp(values)
            if (resp.data) {
                const { access_token, refresh_token } = resp.data
                
                // Store tokens in localStorage
                setTokens(access_token, refresh_token)
                
                // Update Redux state
                dispatch(signInSuccess(access_token))
                
                // Set user info
                dispatch(
                    setUser({
                        avatar: '',
                        userName: values.username,
                        authority: ['USER'],
                        email: values.email,
                    })
                )
                
                // Load all necessary data after successful signup
                dispatch(fetchAllLists())
                dispatch(fetchAllEnums())
                
                const redirectUrl = query.get(REDIRECT_URL_KEY)
                navigate(
                    redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath
                )
                return {
                    status: 'success',
                    message: '',
                }
            }
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }

    const handleSignOut = () => {
        clearTokens()
        dispatch(signOutSuccess())
        dispatch(
            setUser({
                avatar: '',
                userName: '',
                email: '',
                authority: [],
            })
        )
        navigate(appConfig.unAuthenticatedEntryPath)
    }

    const signOut = async () => {
        try {
            // Clear the lists data from Redux store
            dispatch(clearLists())
            
            // Call handleSignOut to clear tokens and auth state
            handleSignOut()
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    return {
        authenticated: token && signedIn,
        signIn,
        signUp,
        signOut,
    }
}

export default useAuth
