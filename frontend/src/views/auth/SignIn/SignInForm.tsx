import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Alert from '@/components/ui/Alert'
import PasswordInput from '@/components/shared/PasswordInput'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useAuth from '@/utils/hooks/useAuth'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import type { CommonProps } from '@/@types/common'
import { useAppDispatch } from '@/store/hook'
import { fetchUserFiles } from '@/store/slices/lists/listsSlice'
import EmailVerificationService from '@/services/EmailVerificationService'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { HiOutlineMail } from 'react-icons/hi'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
    forgotPasswordUrl?: string
    signUpUrl?: string
}

type SignInFormSchema = {
    username: string
    password: string
    rememberMe: boolean
}

const validationSchema = Yup.object().shape({
    username: Yup.string()
        .email('Please enter a valid email')
        .required('Please enter your email'),
    password: Yup.string().required('Please enter your password'),
    rememberMe: Yup.bool(),
})

const SignInForm = (props: SignInFormProps) => {
    const {
        disableSubmit = false,
        className,
        forgotPasswordUrl = '/forgot-password',
        signUpUrl = '/sign-up',
    } = props

    const [message, setMessage] = useTimeOutMessage()
    const [isVerificationError, setIsVerificationError] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { signIn } = useAuth()

    const onSignIn = async (
        values: SignInFormSchema,
        setSubmitting: (isSubmitting: boolean) => void
    ) => {
        const { username, password } = values
        setSubmitting(true)
        
        // Store user email for potential resend verification
        setUserEmail(username)

        const result = await signIn({ username, password })

        if (result?.status === 'failed') {
            // Check if it's an email verification error
            const errorMessage = result.message?.toLowerCase() || '';
            const isVerificationError = 
                errorMessage.includes('verify') ||
                errorMessage.includes('not verified') ||
                errorMessage.includes('verification');
                
            if (isVerificationError) {
                // Redirect to verification page (no email storage needed)
                console.log('Redirecting to verification page for email:', username);
                sessionStorage.setItem('email_keeper', username);
                navigate('/verify-email');
                return; // Don't show error message since we're redirecting
            } else {
                setMessage(result.message)
                setIsVerificationError(false)
            }
        } else {
            // Fetch user data after successful login
            try {
                await dispatch(fetchUserFiles());
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            }
        }

        setSubmitting(false)
    }

    const handleResendVerification = async () => {
        if (!userEmail) {
            toast.push(
                <Notification title="Error" type="danger">
                    Please enter your email address first.
                </Notification>
            );
            return;
        }

        try {
            setResendLoading(true);
            const response = await EmailVerificationService.resendVerificationEmail(userEmail);
            
            if (response.email_sent) {
                toast.push(
                    <Notification title="Success" type="success">
                        Verification email sent to {userEmail}! Please check your inbox.
                    </Notification>
                );
                setIsVerificationError(false);
                setMessage('');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>
            );
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className={className}>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <>{message}</>
                    {isVerificationError && (
                        <div className="mt-3 space-y-2">
                            {!userEmail && (
                                <div>
                                    <Input
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        className="mb-2"
                                    />
                                </div>
                            )}
                            <Button
                                variant="plain"
                                size="sm"
                                onClick={handleResendVerification}
                                loading={resendLoading}
                                icon={<HiOutlineMail />}
                                className="text-blue-600 hover:text-blue-700"
                                disabled={!userEmail}
                            >
                                Resend Verification Email
                            </Button>
                        </div>
                    )}
                </Alert>
            )}
            <Formik
                initialValues={{
                    username: '',
                    password: '',
                    rememberMe: false,
                }}
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting }) => {
                    if (!disableSubmit) {
                        onSignIn(values, setSubmitting)
                    } else {
                        setSubmitting(false)
                    }
                }}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <FormContainer>
                            <FormItem
                                label="Email"
                                invalid={
                                    (errors.username &&
                                        touched.username) as boolean
                                }
                                errorMessage={errors.username}
                            >
                                <Field
                                    type="email"
                                    autoComplete="email"
                                    name="username"
                                    placeholder="Email"
                                    component={Input}
                                />
                            </FormItem>
                            <FormItem
                                label="Password"
                                invalid={
                                    (errors.password &&
                                        touched.password) as boolean
                                }
                                errorMessage={errors.password}
                            >
                                <Field
                                    autoComplete="current-password"
                                    name="password"
                                    placeholder="Password"
                                    component={PasswordInput}
                                />
                            </FormItem>
                            <div className="flex justify-between mb-6">
                                <Field
                                    className="mb-0"
                                    name="rememberMe"
                                    component={Checkbox}
                                >
                                    Remember Me
                                </Field>
                                <ActionLink to={forgotPasswordUrl}>
                                    Forgot Password?
                                </ActionLink>
                            </div>
                            <Button
                                block
                                loading={isSubmitting}
                                variant="solid"
                                type="submit"
                            >
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </Button>
                            <div className="mt-4 text-center">
                                <span>{`Don't have an account yet?`} </span>
                                <ActionLink to={signUpUrl}>Sign up</ActionLink>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SignInForm
