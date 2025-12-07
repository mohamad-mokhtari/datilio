import SignInForm from './SignInForm'

const SignIn = () => {
    const handleBackToHome = () => {
        window.location.href = 'http://localhost:8000'
    }

    return (
        <>
            <div className="mb-4">
                <button
                    onClick={handleBackToHome}
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                    <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    Back to Home
                </button>
            </div>
            <div className="mb-8">
                <h3 className="mb-1">Welcome back!</h3>
                <p>Please enter your credentials to sign in!</p>
            </div>
            <SignInForm disableSubmit={false} />
        </>
    )
}

export default SignIn
