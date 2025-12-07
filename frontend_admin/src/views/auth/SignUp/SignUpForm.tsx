import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';
import ApiService2 from '@/services/ApiService2';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/shared/PasswordInput'
import Alert from '@/components/ui/Alert';
import { FormItem } from '@/components/ui/Form';

interface SignUpFormSchema {
    username: string;
    password: string;
    email: string;
}

const validationSchema = Yup.object().shape({
    username: Yup.string()
        .required('Username is required')
        .min(3, 'Username must be at least 3 characters'),
    email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
    password: Yup.string()
        .required('Password is required')
        .min(6, 'Password must be at least 6 characters'),
});

const SignUpForm = () => {
    const [message, setMessage] = useState<string>('');
    const navigate = useNavigate();

    const onSignUp = async (
        values: SignUpFormSchema,
        setSubmitting: (isSubmitting: boolean) => void
    ) => {
        const { username, password, email } = values;
        setSubmitting(true);
        setMessage('');
        
        try {
            // Create new user
            const response = await ApiService2.post('/user/create', {
                username,
                password,
                email
            });

            if (response.data) {
                // After successful registration, redirect to verification instructions page
                navigate('/verification-instructions', { 
                    state: { email: email } 
                });
            }
        } catch (error: any) {
            setMessage(error?.data?.detail || 'Failed to create account');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    {message}
                </Alert>
            )}
            <Formik
                initialValues={{
                    username: '',
                    password: '',
                    email: '',
                }}
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting }) => {
                    onSignUp(values, setSubmitting);
                }}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <FormItem
                                label="Username"
                                invalid={errors.username && touched.username}
                                errorMessage={errors.username}
                            >
                            <Field
                                type="text"
                                name="username"
                                placeholder="Username"
                                component={Input}
                                prefix={<HiOutlineUser className="text-lg" />}
                            />
                        </FormItem>
                        <FormItem
                                label="Email"
                                invalid={errors.email && touched.email}
                                errorMessage={errors.email}
                            >
                            <Field
                                type="email"
                                name="email"
                                placeholder="Email"
                                component={Input}
                                prefix={<HiOutlineMail className="text-lg" />}
                            />
                        </FormItem>
                        <FormItem
                                label="Password"
                                invalid={errors.password && touched.password}
                                errorMessage={errors.password}
                            >
                            <Field
                                type="password"
                                name="password"
                                placeholder="Password"
                                component={PasswordInput}
                                prefix={<HiOutlineLockClosed className="text-lg" />}
                            />
                        </FormItem>
                        <Button
                            block
                            loading={isSubmitting}
                            variant="solid"
                            type="submit"
                        >
                            Sign Up
                        </Button>
                    </Form>
                )}
            </Formik>
            <div className="mt-4 text-center">
                <span className="text-gray-500">Already have an account? </span>
                <span
                    className="text-blue-500 cursor-pointer hover:text-blue-600"
                    onClick={() => navigate('/auth/login')}
                >
                    Sign In
                </span>
            </div>
        </div>
    );
};

export default SignUpForm;
