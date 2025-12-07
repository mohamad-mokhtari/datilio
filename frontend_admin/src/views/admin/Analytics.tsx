import { useState, useEffect } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { HiOutlineSearch, HiRefresh, HiTrendingUp, HiUsers, HiChartBar } from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import AdminAnalyticsService from '@/services/AdminAnalyticsService'
import { UsageAnalytics, AnalyticsParams } from '@/@types/analytics'

const AnalyticsPage = () => {
    const [data, setData] = useState<UsageAnalytics | null>(null)
    const [loading, setLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [featureFilter, setFeatureFilter] = useState('')

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const params: AnalyticsParams = {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                feature: featureFilter || undefined
            }

            console.log('Fetching analytics with params:', params)
            const response = await AdminAnalyticsService.getUsageAnalytics(params)
            console.log('Analytics API response:', response)
            
            setData(response.data)
        } catch (error) {
            toast.error('Failed to fetch analytics')
            console.error('Error fetching analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const handleSearch = () => {
        fetchAnalytics()
    }

    const handleReset = () => {
        setStartDate('')
        setEndDate('')
        setFeatureFilter('')
        fetchAnalytics()
    }

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
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Usage Analytics</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Detailed analytics and trends for system usage
                    </p>
                </div>
                <Button 
                    onClick={fetchAnalytics} 
                    loading={loading}
                    className='flex items-center'
                >
                    <HiRefresh className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-48"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-48"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Feature</label>
                            <Select
                                value={[
                                    { label: 'All Features', value: '' },
                                    { label: 'File Storage', value: 'file_storage_mb' },
                                    { label: 'OpenAI Tokens', value: 'openai_tokens' },
                                    { label: 'Synthetic Rows', value: 'synthetic_rows' },
                                    { label: 'Custom Lists', value: 'custom_lists' }
                                ].find(opt => opt.value === featureFilter) || null}
                                onChange={(option) => setFeatureFilter(option?.value || '')}
                                placeholder="Filter by feature"
                                className="w-48"
                                options={[
                                    { label: 'All Features', value: '' },
                                    { label: 'File Storage', value: 'file_storage_mb' },
                                    { label: 'OpenAI Tokens', value: 'openai_tokens' },
                                    { label: 'Synthetic Rows', value: 'synthetic_rows' },
                                    { label: 'Custom Lists', value: 'custom_lists' }
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="solid"
                            onClick={handleSearch}
                            loading={loading}
                            className="px-6 py-2 flex items-center"
                        >
                            <HiOutlineSearch className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                        <Button
                            variant="twoTone"
                            onClick={handleReset}
                            className="px-6 py-2"
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </div>

            {data && (
                <>
                    {/* Daily Trends Chart */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                                <HiTrendingUp className="w-5 h-5 mr-2" />
                                Daily Trends
                            </h3>
                            <div className="h-64 flex items-end justify-between space-x-1 px-2">
                                {data.daily_trends.map((trend, index) => {
                                    const maxUsage = Math.max(...data.daily_trends.map(t => t.total_amount))
                                    const height = maxUsage > 0 ? (trend.total_amount / maxUsage) * 100 : 0
                                    
                                    return (
                                        <div key={trend.date} className="flex-1 flex flex-col items-center min-w-0 h-full">
                                            {/* Chart Bar */}
                                            <div className="w-full bg-gray-100 rounded-t mb-2 relative flex flex-col justify-end" style={{ height: '200px' }}>
                                                <div 
                                                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                                    style={{ 
                                                        height: `${height}%`,
                                                        minHeight: height > 0 ? '2px' : '0px'
                                                    }}
                                                ></div>
                                            </div>
                                            
                                            {/* Data Labels */}
                                            <div className="text-xs text-gray-500 text-center w-full">
                                                <div className="font-medium text-gray-900 truncate" title={formatNumber(trend.total_amount)}>
                                                    {formatNumber(trend.total_amount)}
                                                </div>
                                                <div className="mt-1 text-gray-600">
                                                    {new Date(trend.date).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </div>
                                                <div className="text-gray-400 mt-1">
                                                    {trend.usage_count} uses
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Feature Breakdown */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                                <HiChartBar className="w-5 h-5 mr-2" />
                                Feature Breakdown
                            </h3>
                            <div className="space-y-4">
                                {data.feature_breakdown.map((feature) => (
                                    <div key={feature.feature} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                                <div className={`w-3 h-3 rounded-full ${getFeatureColor(feature.feature)} mr-2`}></div>
                                                {formatFeatureName(feature.feature)}
                                            </h4>
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

                    {/* User Engagement */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                                <HiUsers className="w-5 h-5 mr-2" />
                                User Engagement
                            </h3>
                            <div className="h-48 flex items-end justify-between space-x-1 px-2">
                                {data.user_engagement.map((engagement, index) => {
                                    const maxUsers = Math.max(...data.user_engagement.map(e => e.active_users))
                                    const height = maxUsers > 0 ? (engagement.active_users / maxUsers) * 100 : 0
                                    
                                    return (
                                        <div key={engagement.date} className="flex-1 flex flex-col items-center min-w-0 h-full">
                                            {/* Chart Bar */}
                                            <div className="w-full bg-gray-100 rounded-t mb-2 relative flex flex-col justify-end" style={{ height: '150px' }}>
                                                <div 
                                                    className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                                                    style={{ 
                                                        height: `${height}%`,
                                                        minHeight: height > 0 ? '2px' : '0px'
                                                    }}
                                                ></div>
                                            </div>
                                            
                                            {/* Data Labels */}
                                            <div className="text-xs text-gray-500 text-center w-full">
                                                <div className="font-medium text-gray-900">
                                                    {engagement.active_users}
                                                </div>
                                                <div className="mt-1 text-gray-600">
                                                    {new Date(engagement.date).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </div>
                                                <div className="text-gray-400 mt-1">
                                                    active
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {!data && !loading && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No analytics data available</p>
                    <Button onClick={fetchAnalytics} className='flex items-center'>
                        <HiRefresh className="w-4 h-4 mr-2" />
                        Retry
                    </Button>
                </div>
            )}
        </div>
    )
}

export default AnalyticsPage
