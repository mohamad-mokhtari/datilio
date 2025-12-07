import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { 
    HiRefresh, 
    HiDocumentText, 
    HiGlobe, 
    HiEye, 
    HiEyeOff,
    HiTrendingUp,
    HiCalendar,
    HiTag,
    HiUser
} from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import AdminBlogService from '@/services/AdminBlogService'
import { BlogAnalytics } from '@/@types/blog'

const BlogAnalyticsPage: React.FC = () => {
    const [data, setData] = useState<BlogAnalytics | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const response = await AdminBlogService.getBlogAnalytics()
            setData(response.data)
        } catch (error) {
            console.error('Error fetching blog analytics:', error)
            toast.error('Failed to fetch blog analytics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusBadge = (isPublished: boolean) => {
        if (isPublished) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <HiGlobe className="w-3 h-3 mr-1" />
                    Published
                </span>
            )
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <HiEyeOff className="w-3 h-3 mr-1" />
                    Draft
                </span>
            )
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <p className="text-gray-500">No analytics data available</p>
                    <Button onClick={fetchAnalytics} className="mt-4">
                        <HiRefresh className="w-4 h-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Blog Analytics</h1>
                        <p className="text-gray-600">Overview of your blog performance and statistics</p>
                    </div>
                    <Button onClick={fetchAnalytics} loading={loading} className='flex items-center'>
                        <HiRefresh className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiDocumentText className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Posts
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.total_posts}
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
                                <HiGlobe className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Published Posts
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.published_posts}
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
                                <HiEyeOff className="h-8 w-8 text-yellow-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Draft Posts
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.draft_posts}
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
                                <HiEye className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Views
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.total_views.toLocaleString()}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Popular Posts */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <HiTrendingUp className="w-5 h-5 mr-2 text-green-600" />
                            Most Popular Posts
                        </h3>
                    </div>
                    <div className="p-6">
                        {data.popular_posts.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No popular posts yet</p>
                        ) : (
                            <div className="space-y-4">
                                {data.popular_posts.map((post, index) => (
                                    <div key={post.id} className="flex items-start space-x-4">
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                                {post.title}
                                            </h4>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-xs text-gray-500">
                                                    {post.view_count.toLocaleString()} views
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(post.published_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Posts by Category */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <HiTag className="w-5 h-5 mr-2 text-blue-600" />
                            Posts by Category
                        </h3>
                    </div>
                    <div className="p-6">
                        {data.posts_by_category.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No categories found</p>
                        ) : (
                            <div className="space-y-3">
                                {data.posts_by_category.map((category, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {category.category}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {category.count} post{category.count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Posts */}
            <div className="mt-8">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <HiCalendar className="w-5 h-5 mr-2 text-gray-600" />
                            Recent Posts
                        </h3>
                    </div>
                    <div className="overflow-hidden">
                        {data.recent_posts.length === 0 ? (
                            <div className="p-6">
                                <p className="text-gray-500 text-center">No recent posts found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.recent_posts.map((post) => (
                                            <tr key={post.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {post.title}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {post.slug}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(post.is_published)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(post.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Additional Statistics */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiTrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Publishing Rate
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.total_posts > 0 
                                            ? Math.round((data.published_posts / data.total_posts) * 100)
                                            : 0}%
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
                                <HiEye className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Avg Views per Post
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.published_posts > 0 
                                            ? Math.round(data.total_views / data.published_posts)
                                            : 0}
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
                                <HiDocumentText className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Content Categories
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {data.posts_by_category.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BlogAnalyticsPage
