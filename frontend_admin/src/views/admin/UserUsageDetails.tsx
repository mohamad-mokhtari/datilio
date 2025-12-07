import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { HiArrowLeft, HiRefresh, HiUser, HiChartBar, HiClock, HiEye } from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import AdminAnalyticsService from '@/services/AdminAnalyticsService'
import { UserUsageDetails } from '@/@types/analytics'

const UserUsageDetailsPage = () => {
    const { userId } = useParams<{ userId: string }>()
    const navigate = useNavigate()
    const [data, setData] = useState<UserUsageDetails | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchUserUsageDetails = async () => {
        if (!userId) return
        
        setLoading(true)
        try {
            const response = await AdminAnalyticsService.getUserUsageDetails(userId)
            setData(response.data)
        } catch (error) {
            toast.error('Failed to fetch user usage details')
            console.error('Error fetching user usage details:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUserUsageDetails()
    }, [userId])

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M'
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K'
        }
        return num.toFixed(1)
    }

    const formatFeatureName = (feature: string) => {
        return feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getFeatureColor = (feature: string) => {
        const colors: { [key: string]: string } = {
            'file_storage_mb': 'bg-blue-500',
            'openai_tokens': 'bg-green-500',
            'synthetic_rows': 'bg-yellow-500',
            'custom_lists': 'bg-red-500'
        }
        return colors[feature] || 'bg-gray-500'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading user usage details...</p>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No usage data available for this user</p>
                <Button onClick={fetchUserUsageDetails} loading={loading}>
                    <HiRefresh className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="twoTone"
                        onClick={() => navigate(-1)}
                        className="flex items-center"
                    >
                        <HiArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">User Usage Details</h1>
                        <p className="mt-2 text-sm text-gray-700">
                            Detailed usage analytics for {data.user.email}
                        </p>
                    </div>
                </div>
                <Button onClick={fetchUserUsageDetails} loading={loading}>
                    <HiRefresh className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* User Information */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <HiUser className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">{data.user.email}</h3>
                            <p className="text-sm text-gray-500">@{data.user.username}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">User ID</label>
                            <p className="mt-1 text-sm text-gray-900 font-mono">{data.user.id}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Created At</label>
                            <p className="mt-1 text-sm text-gray-900">{formatDate(data.user.created_at)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Login</label>
                            <p className="mt-1 text-sm text-gray-900">{formatDate(data.user.last_login)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Features Used</label>
                            <p className="mt-1 text-sm text-gray-900">{data.usage_by_feature.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage by Feature */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                        <HiChartBar className="w-5 h-5 mr-2" />
                        Usage by Feature
                    </h3>
                    <div className="space-y-4">
                        {data.usage_by_feature.map((feature) => (
                            <div key={feature.feature} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                        <div className={`w-3 h-3 rounded-full ${getFeatureColor(feature.feature)} mr-2`}></div>
                                        {formatFeatureName(feature.feature)}
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                        Last used: {formatDate(feature.last_used)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Total Amount</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatNumber(feature.total_amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Usage Count</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {feature.usage_count}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Average per Use</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatNumber(feature.total_amount / feature.usage_count)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                        <HiClock className="w-5 h-5 mr-2" />
                        Recent Activity
                    </h3>
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Feature
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.recent_activity.map((activity) => (
                                    <tr key={activity.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-2 h-2 rounded-full ${getFeatureColor(activity.feature)} mr-2`}></div>
                                                <span className="text-sm text-gray-900">
                                                    {formatFeatureName(activity.feature)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatNumber(activity.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {activity.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(activity.timestamp)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserUsageDetailsPage
