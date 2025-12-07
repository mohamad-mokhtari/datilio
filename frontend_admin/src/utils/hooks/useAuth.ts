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
                
                // Set user info from API response
                if (resp.userData) {
                    dispatch(
                        setUser({
                            avatar: '',
                            userName: resp.userData.username,
                            authority: ['admin'],
                            email: resp.userData.email,
                            role: resp.userData.role,
                            id: resp.userData.id,
                        })
                    )
                } else {
                    // Fallback if no user data (shouldn't happen for admin users)
                    dispatch(
                        setUser({
                            avatar: '',
                            userName: values.username,
                            authority: ['admin'],
                            email: values.username,
                            role: 'admin',
                        })
                    )
                }
                
                // Load all necessary data after successful login
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
                        authority: ['admin'],
                        email: values.email,
                        role: 'admin',
                    })
                )
                
                // Load all necessary data after successful signup
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
