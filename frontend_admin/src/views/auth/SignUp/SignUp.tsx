import SignUpForm from './SignUpForm'

const SignUp = () => {
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
                <h3 className="mb-1">Create Account</h3>
                <p>Please fill in the form to register</p>
            </div>
            <SignUpForm disableSubmit={false} />
            <div className="mt-4 text-xs text-center">
                <span>By signing up, you agree to our </span>
                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                <span> and </span>
                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </div>
        </>
    )
}

export default SignUp
