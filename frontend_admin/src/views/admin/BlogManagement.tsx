import React, { useState, useEffect } from 'react'
import { Button, Input, Select, Table, Pagination } from '@/components/ui'
import { 
    HiOutlineSearch, 
    HiArrowUp, 
    HiPlus, 
    HiPencil, 
    HiTrash, 
    HiEye, 
    HiDotsVertical,
    HiEyeOff,
    HiGlobe,
    HiCalendar,
    HiUser,
    HiTag,
    HiX
} from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import AdminBlogService from '@/services/AdminBlogService'
import { BlogPost, BlogListParams, BlogListResponse, BLOG_CATEGORIES } from '@/@types/blog'
import ConfirmModal from '@/components/shared/ConfirmModal'
import BlogFormModal from '@/components/blog/BlogFormModal'

const BlogManagement: React.FC = () => {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [pageSize] = useState(20)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [publishedFilter, setPublishedFilter] = useState<boolean | undefined>(undefined)

    // Modals
    const [showFormModal, setShowFormModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
    const [formLoading, setFormLoading] = useState(false)

    // Confirm modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning' as 'danger' | 'warning' | 'success' | 'info',
        isLoading: false,
        onConfirm: () => {}
    })

    const fetchPosts = async () => {
        setLoading(true)
        try {
            const params: BlogListParams = {
                page: currentPage,
                page_size: pageSize,
                search: searchTerm || undefined,
                category: categoryFilter || undefined,
                published_only: publishedFilter
            }

            console.log('Fetching blog posts with params:', params)
            const response = await AdminBlogService.getBlogPosts(params)
            console.log('Blog posts response:', response)
            console.log('Response data:', response.data)
            console.log('Response data type:', typeof response.data)
            console.log('Is array?', Array.isArray(response.data))

            // Handle both array response and wrapped response
            const responseData = response.data
            let postsData: BlogPost[] = []
            let totalCount = 0

            if (Array.isArray(responseData)) {
                // Direct array response
                postsData = responseData
                totalCount = responseData.length
                console.log('Using direct array response')
            } else if (responseData && typeof responseData === 'object') {
                // Wrapped response
                postsData = responseData.posts || []
                totalCount = responseData.total || 0
                console.log('Using wrapped response')
            } else {
                console.log('Unknown response format:', responseData)
            }

            console.log('Processed posts data:', postsData)
            console.log('Total count:', totalCount)

            setPosts(postsData)
            setTotalPages(Math.ceil(totalCount / pageSize))
        } catch (error) {
            console.error('Error fetching blog posts:', error)
            toast.error('Failed to fetch blog posts')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()
    }, [currentPage])

    const handleSearch = () => {
        setCurrentPage(1)
        fetchPosts()
    }

    const handleReset = () => {
        setSearchTerm('')
        setCategoryFilter('')
        setPublishedFilter(undefined)
        setCurrentPage(1)
        fetchPosts()
    }

    const showConfirmModal = (
        title: string,
        message: string,
        type: 'danger' | 'warning' | 'success' | 'info',
        onConfirm: () => void
    ) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            isLoading: false,
            onConfirm
        })
    }

    const handleCreatePost = () => {
        setEditingPost(null)
        setShowFormModal(true)
    }

    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post)
        setShowFormModal(true)
    }

    const handleViewPost = (post: BlogPost) => {
        setSelectedPost(post)
        setShowDetailModal(true)
    }

    const handleFormSubmit = async (data: any) => {
        console.log('BlogManagement: handleFormSubmit called with data:', data)
        setFormLoading(true)
        try {
            if (editingPost) {
                console.log('Updating post:', editingPost.id)
                await AdminBlogService.updateBlogPost(editingPost.id, data)
                toast.success('Blog post updated successfully')
            } else {
                console.log('Creating new post')
                await AdminBlogService.createBlogPost(data)
                toast.success('Blog post created successfully')
            }
            fetchPosts()
            setShowFormModal(false)
        } catch (error) {
            console.error('Error in handleFormSubmit:', error)
            toast.error(editingPost ? 'Failed to update blog post' : 'Failed to create blog post')
        } finally {
            setFormLoading(false)
        }
    }

    const handlePublishToggle = async (post: BlogPost) => {
        const action = post.is_published ? 'unpublish' : 'publish'
        const actionText = post.is_published ? 'unpublish' : 'publish'
        
        showConfirmModal(
            `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Post`,
            `Are you sure you want to ${actionText} "${post.title}"?`,
            'warning',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    if (post.is_published) {
                        await AdminBlogService.unpublishBlogPost(post.id)
                    } else {
                        await AdminBlogService.publishBlogPost(post.id)
                    }
                    toast.success(`Post ${actionText}ed successfully`)
                    fetchPosts()
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error(`Failed to ${actionText} post`)
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleDeletePost = async (post: BlogPost) => {
        showConfirmModal(
            'Delete Blog Post',
            `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
            'danger',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminBlogService.deleteBlogPost(post.id)
                    toast.success('Blog post deleted successfully')
                    fetchPosts()
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to delete blog post')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusBadge = (post: BlogPost) => {
        if (post.is_published) {
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

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
                <p className="text-gray-600">Manage your blog posts and content</p>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="w-64">
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title or content..."
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="w-48">
                            <Select
                                value={[
                                    { label: 'All Categories', value: '' },
                                    ...BLOG_CATEGORIES.map(cat => ({ label: cat, value: cat }))
                                ].find(opt => opt.value === categoryFilter) || null}
                                onChange={(option) => setCategoryFilter(option?.value || '')}
                                placeholder="Filter by category"
                                options={[
                                    { label: 'All Categories', value: '' },
                                    ...BLOG_CATEGORIES.map(cat => ({ label: cat, value: cat }))
                                ]}
                            />
                        </div>
                        <div className="w-48">
                            <Select
                                value={[
                                    { label: 'All Posts', value: '' },
                                    { label: 'Published Only', value: 'true' },
                                    { label: 'Drafts Only', value: 'false' }
                                ].find(opt => opt.value === publishedFilter?.toString()) || null}
                                onChange={(option) => {
                                    if (option?.value === '') {
                                        setPublishedFilter(undefined)
                                    } else {
                                        setPublishedFilter(option?.value === 'true')
                                    }
                                }}
                                placeholder="Filter by status"
                                options={[
                                    { label: 'All Posts', value: '' },
                                    { label: 'Published Only', value: 'true' },
                                    { label: 'Drafts Only', value: 'false' }
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
                            className="px-6 py-2 flex items-center"
                        >
                            <HiArrowUp className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mb-6">
                <div className="text-sm text-gray-500">
                    {posts.length} post{posts.length !== 1 ? 's' : ''} found
                </div>
                <Button
                    variant="solid"
                    onClick={handleCreatePost}
                    className="flex items-center"
                >
                    <HiPlus className="w-4 h-4 mr-2" />
                    Create New Post
                </Button>
            </div>

            {/* Posts Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Post
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Author
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Views
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                        Loading posts...
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                        No blog posts found
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {post.title}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {post.summary}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {post.tags.slice(0, 3).map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                                                        >
                                                            <HiTag className="w-2 h-2 mr-1" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {post.tags.length > 3 && (
                                                        <span className="text-xs text-gray-400">
                                                            +{post.tags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <HiUser className="w-4 h-4 text-gray-400 mr-2" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {post.author_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {post.author_email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {post.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(post)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {post.view_count.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <HiCalendar className="w-4 h-4 mr-1" />
                                                {formatDate(post.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-20">
                                            <div className="relative">
                                                <select
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    onChange={(e) => {
                                                        const action = e.target.value
                                                        e.target.value = ''
                                                        
                                                        switch (action) {
                                                            case 'view':
                                                                handleViewPost(post)
                                                                break
                                                            case 'edit':
                                                                handleEditPost(post)
                                                                break
                                                            case 'publish':
                                                            case 'unpublish':
                                                                handlePublishToggle(post)
                                                                break
                                                            case 'delete':
                                                                handleDeletePost(post)
                                                                break
                                                        }
                                                    }}
                                                >
                                                    <option value="">Actions</option>
                                                    <option value="view">View Details</option>
                                                    <option value="edit">Edit Post</option>
                                                    <option value={post.is_published ? 'unpublish' : 'publish'}>
                                                        {post.is_published ? 'Unpublish' : 'Publish'}
                                                    </option>
                                                    <option value="delete">Delete Post</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200">
                        <Pagination
                            currentPage={currentPage}
                            total={totalPages}
                            onChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Form Modal */}
            <BlogFormModal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                onSubmit={handleFormSubmit}
                initialData={editingPost}
                loading={formLoading}
            />

            {/* Detail Modal */}
            {showDetailModal && selectedPost && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="relative w-11/12 max-w-4xl max-h-[90vh] shadow-lg rounded-md bg-white flex flex-col">
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Blog Post Details</h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <HiX className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                        {selectedPost.title}
                                    </h1>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                        <span>By {selectedPost.author_name}</span>
                                        <span>•</span>
                                        <span>{formatDate(selectedPost.created_at)}</span>
                                        <span>•</span>
                                        <span>{selectedPost.reading_time_minutes} min read</span>
                                        <span>•</span>
                                        <span>{selectedPost.view_count} views</span>
                                    </div>
                                    {getStatusBadge(selectedPost)}
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
                                    <p className="text-gray-600">{selectedPost.summary}</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Category & Tags</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {selectedPost.category}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPost.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                                            >
                                                <HiTag className="w-2 h-2 mr-1" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {selectedPost.featured_image_url && (
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Featured Image</h3>
                                        <img
                                            src={selectedPost.featured_image_url}
                                            alt={selectedPost.title}
                                            className="w-full h-64 object-cover rounded-lg"
                                        />
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Content</h3>
                                    <div className="prose max-w-none">
                                        {selectedPost.content.body.map((block, index) => (
                                            <div key={index} className="mb-4">
                                                {block.type === 'heading' && (
                                                    <h2 className="text-xl font-bold text-gray-900">
                                                        {block.text}
                                                    </h2>
                                                )}
                                                {block.type === 'paragraph' && (
                                                    <p className="text-gray-600">{block.text}</p>
                                                )}
                                                {block.type === 'code' && (
                                                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                                                        <code className="text-sm">{block.content}</code>
                                                    </pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-md">
                            <Button
                                variant="twoTone"
                                onClick={() => setShowDetailModal(false)}
                                className="flex items-center justify-center"
                            >
                                Close Modal
                            </Button>
                            <div className="flex space-x-3">
                                <Button
                                    variant="solid"
                                    onClick={() => {
                                        setShowDetailModal(false)
                                        handleEditPost(selectedPost)
                                    }}
                                >
                                    <HiPencil className="w-4 h-4 mr-2" />
                                    Edit Post
                                </Button>
                                <Button
                                    variant="twoTone"
                                    onClick={() => {
                                        setShowDetailModal(false)
                                        handlePublishToggle(selectedPost)
                                    }}
                                >
                                    {selectedPost.is_published ? (
                                        <>
                                            <HiEyeOff className="w-4 h-4 mr-2" />
                                            Unpublish
                                        </>
                                    ) : (
                                        <>
                                            <HiGlobe className="w-4 h-4 mr-2" />
                                            Publish
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="solid"
                                    color="red"
                                    onClick={() => {
                                        setShowDetailModal(false)
                                        handleDeletePost(selectedPost)
                                    }}
                                >
                                    <HiTrash className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isLoading={confirmModal.isLoading}
            />
        </div>
    )
}

export default BlogManagement
