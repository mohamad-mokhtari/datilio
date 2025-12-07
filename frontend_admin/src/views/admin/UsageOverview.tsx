import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { HiRefresh, HiUsers, HiChartBar, HiTrendingUp, HiClock } from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import AdminAnalyticsService from '@/services/AdminAnalyticsService'
import { UsageOverview } from '@/@types/analytics'

const UsageOverviewPage = () => {
    const [data, setData] = useState<UsageOverview | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchUsageOverview = async () => {
        setLoading(true)
        try {
            const response = await AdminAnalyticsService.getUsageOverview()
            setData(response.data)
        } catch (error) {
            toast.error('Failed to fetch usage overview')
            console.error('Error fetching usage overview:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsageOverview()
    }, [])

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

    const getFeatureColor = (index: number) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-yellow-500',
            'bg-red-500',
            'bg-purple-500',
            'bg-indigo-500',
            'bg-pink-500',
            'bg-teal-500'
        ]
        return colors[index % colors.length]
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading usage overview...</p>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No usage data available</p>
                <Button onClick={fetchUsageOverview} loading={loading}>
                    <HiRefresh className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Usage Overview</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Comprehensive usage statistics and analytics for your platform
                    </p>
                </div>
                <Button onClick={fetchUsageOverview} loading={loading}>
                    <HiRefresh className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiUsers className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Users
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.total_users}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiTrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Users
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.active_users}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiChartBar className="h-8 w-8 text-yellow-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Features
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.usage_by_feature.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiClock className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Recent Activity
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.recent_activity.length} days
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage by Feature */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Usage by Feature
                    </h3>
                    <div className="space-y-4">
                        {data.usage_by_feature.map((feature, index) => (
                            <div key={feature.feature} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-900">
                                        {formatFeatureName(feature.feature)}
                                    </h4>
                                    <div className={`w-3 h-3 rounded-full ${getFeatureColor(index)}`}></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Total Amount</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatNumber(feature.total_amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Usage Count</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {feature.usage_count}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Unique Users</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {feature.unique_users}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Avg per User</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatNumber(feature.total_amount / feature.unique_users)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Users */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Top Users by Usage
                    </h3>
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rank
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Usage
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.top_users.map((user, index) => (
                                    <tr key={user.email}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatNumber(user.total_usage)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recent Activity Chart */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Recent Activity (Last 30 Days)
                    </h3>
                    <div className="h-64 flex items-end justify-between space-x-2">
                        {data.recent_activity.map((activity, index) => {
                            const maxUsage = Math.max(...data.recent_activity.map(a => a.daily_usage))
                            const height = (activity.daily_usage / maxUsage) * 100
                            
                            return (
                                <div key={activity.date} className="flex-1 flex flex-col items-center">
                                    <div className="w-full bg-gray-200 rounded-t" style={{ height: `${height}%` }}>
                                        <div className="w-full h-full bg-blue-500 rounded-t"></div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 text-center">
                                        <div>{activity.daily_usage}</div>
                                        <div className="mt-1">
                                            {new Date(activity.date).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UsageOverviewPage
