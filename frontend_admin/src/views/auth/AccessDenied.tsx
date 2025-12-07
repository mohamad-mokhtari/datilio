import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { HiShieldExclamation } from 'react-icons/hi'

const AccessDenied = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <HiShieldExclamation className="mx-auto h-24 w-24 text-red-500" />
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Access Denied
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        You don't have permission to access this admin panel. 
                        Only administrators are allowed to access this area.
                    </p>
                    <div className="mt-8 space-y-4">
                        <Button
                            asChild
                            className="w-full"
                            variant="solid"
                        >
                            <Link to="/sign-in">
                                Return to Sign In
                            </Link>
                        </Button>
                        <Button
                            asChild
                            className="w-full"
                            variant="outline"
                        >
                            <Link to="/">
                                Go to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccessDenied
