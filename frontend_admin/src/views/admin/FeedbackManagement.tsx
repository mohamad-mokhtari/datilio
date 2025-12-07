import { useState, useEffect } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { HiOutlineSearch, HiEye, HiChat, HiXCircle, HiCheckCircle, HiTrash, HiDotsVertical } from 'react-icons/hi'
import { Dropdown } from '@/components/ui'
import { toast } from 'react-hot-toast'
import AdminFeedbackService from '@/services/AdminFeedbackService'
import { 
    FeedbackListResponse, 
    FeedbackResponse, 
    FeedbackListParams,
    FeedbackMessageCreate
} from '@/@types/feedback'
import ConfirmModal from '@/components/shared/ConfirmModal'

const FeedbackManagement = () => {
    const [feedback, setFeedback] = useState<FeedbackListResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 20

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')

    // Modal states
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackResponse | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning' as 'danger' | 'warning' | 'success' | 'info',
        isLoading: false,
        onConfirm: () => {}
    })

    // Message form
    const [newMessage, setNewMessage] = useState('')
    const [messageImage, setMessageImage] = useState<File | null>(null)
    const [sendingMessage, setSendingMessage] = useState(false)

    const fetchFeedback = async () => {
        setLoading(true)
        try {
            const params: FeedbackListParams = {
                page: currentPage,
                page_size: pageSize,
                status: (statusFilter as 'open' | 'closed' | undefined) || undefined,
                feedback_type: (typeFilter as 'bug' | 'feature' | 'general' | 'ui' | undefined) || undefined
            }

            console.log('Fetching feedback with params:', params)
            const response = await AdminFeedbackService.getFeedbackList(params)
            console.log('Feedback API response:', response)
            
            const feedbackData = Array.isArray(response.data) ? response.data : (response.data as any)?.feedback || []
            const totalCount = Array.isArray(response.data) ? response.data.length : (response.data as any)?.total || 0

            console.log('Processed feedback data:', feedbackData)
            console.log('Total count:', totalCount)

            setFeedback(feedbackData)
            setTotalPages(Math.ceil(totalCount / pageSize))
        } catch (error) {
            toast.error('Failed to fetch feedback')
            console.error('Error fetching feedback:', error)
            console.error('Error details:', {
                message: (error as any)?.message,
                status: (error as any)?.status,
                data: (error as any)?.data
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFeedback()
    }, [currentPage, statusFilter, typeFilter])

    const handleSearch = () => {
        setCurrentPage(1)
        fetchFeedback()
    }

    const handleReset = () => {
        setSearchTerm('')
        setStatusFilter('')
        setTypeFilter('')
        setCurrentPage(1)
        fetchFeedback()
    }

    const handleViewDetails = async (feedbackId: string) => {
        try {
            const response = await AdminFeedbackService.getFeedbackById(feedbackId)
            setSelectedFeedback(response.data)
            setShowDetailModal(true)
        } catch (error) {
            toast.error('Failed to fetch feedback details')
        }
    }

    const handleCloseFeedback = async (feedbackId: string, title: string) => {
        showConfirmModal(
            'Close Feedback',
            `Are you sure you want to close feedback "${title}"?`,
            'warning',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminFeedbackService.closeFeedback(feedbackId)
                    toast.success('Feedback closed successfully')
                    fetchFeedback()
                    if (selectedFeedback?.id === feedbackId) {
                        setSelectedFeedback(prev => prev ? { ...prev, status: 'closed' } : null)
                    }
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to close feedback')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleReopenFeedback = async (feedbackId: string, title: string) => {
        showConfirmModal(
            'Reopen Feedback',
            `Are you sure you want to reopen feedback "${title}"?`,
            'info',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminFeedbackService.reopenFeedback(feedbackId)
                    toast.success('Feedback reopened successfully')
                    fetchFeedback()
                    if (selectedFeedback?.id === feedbackId) {
                        setSelectedFeedback(prev => prev ? { ...prev, status: 'open' } : null)
                    }
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to reopen feedback')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleDeleteFeedback = async (feedbackId: string, title: string) => {
        showConfirmModal(
            'Delete Feedback',
            `Are you sure you want to delete feedback "${title}"? This action cannot be undone and will permanently remove all feedback data and messages.`,
            'danger',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminFeedbackService.deleteFeedback(feedbackId)
                    toast.success('Feedback deleted successfully')
                    fetchFeedback()
                    setShowDetailModal(false)
                    setSelectedFeedback(null)
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to delete feedback')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleSendMessage = async () => {
        if (!selectedFeedback || (!newMessage.trim() && !messageImage)) {
            toast.error('Please enter a message or attach an image')
            return
        }

        setSendingMessage(true)
        try {
            const messageData: FeedbackMessageCreate = {
                message: newMessage.trim(),
                image_file: messageImage || undefined
            }

            await AdminFeedbackService.addMessage(selectedFeedback.id, messageData)
            toast.success('Message sent successfully')
            
            // Refresh feedback details
            const response = await AdminFeedbackService.getFeedbackById(selectedFeedback.id)
            setSelectedFeedback(response.data)
            
            // Clear form
            setNewMessage('')
            setMessageImage(null)
        } catch (error) {
            toast.error('Failed to send message')
        } finally {
            setSendingMessage(false)
        }
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
        } as any)
    }

    const getStatusBadge = (status: string) => {
        return status === 'open' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Open
            </span>
        ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Closed
            </span>
        )
    }

    const getTypeBadge = (type: string) => {
        const typeColors = {
            bug: 'bg-red-100 text-red-800',
            feature: 'bg-blue-100 text-blue-800',
            general: 'bg-gray-100 text-gray-800',
            ui: 'bg-purple-100 text-purple-800'
        }
        
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[type as keyof typeof typeColors] || typeColors.general}`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
        )
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

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Feedback Management</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage user feedback, respond to messages, and track feedback status.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="w-48">
                            <Select
                                value={[
                                    { label: 'All Status', value: '' },
                                    { label: 'Open', value: 'open' },
                                    { label: 'Closed', value: 'closed' }
                                ].find(opt => opt.value === statusFilter) || null}
                                onChange={(option) => setStatusFilter(option?.value || '')}
                                placeholder="Filter by status"
                                options={[
                                    { label: 'All Status', value: '' },
                                    { label: 'Open', value: 'open' },
                                    { label: 'Closed', value: 'closed' }
                                ]}
                            />
                        </div>
                        <div className="w-48">
                            <Select
                                value={[
                                    { label: 'All Types', value: '' },
                                    { label: 'Bug', value: 'bug' },
                                    { label: 'Feature', value: 'feature' },
                                    { label: 'General', value: 'general' },
                                    { label: 'UI', value: 'ui' }
                                ].find(opt => opt.value === typeFilter) || null}
                                onChange={(option) => setTypeFilter(option?.value || '')}
                                placeholder="Filter by type"
                                options={[
                                    { label: 'All Types', value: '' },
                                    { label: 'Bug', value: 'bug' },
                                    { label: 'Feature', value: 'feature' },
                                    { label: 'General', value: 'general' },
                                    { label: 'UI', value: 'ui' }
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="solid"
                            onClick={handleSearch}
                            loading={loading}
                            className="flex justify-center items-center px-6 py-2"
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

            {/* Feedback Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Messages
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
                                        Loading feedback...
                                    </td>
                                </tr>
                            ) : feedback.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                        No feedback found
                                    </td>
                                </tr>
                            ) : (
                                feedback.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                {item.title}
                                            </div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">
                                                {item.message}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.user_email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getTypeBadge(item.feedback_type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {item.message_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(item.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-20">
                                            <Dropdown
                                                renderTitle={
                                                    <HiDotsVertical className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                                }
                                                className="ml-auto"
                                                placement="bottom-end"
                                            >
                                                <Dropdown.Item
                                                    eventKey="view"
                                                    onSelect={() => handleViewDetails(item.id)}
                                                >
                                                    <HiEye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </Dropdown.Item>
                                                {item.status === 'open' ? (
                                                    <Dropdown.Item
                                                        eventKey="close"
                                                        onSelect={() => handleCloseFeedback(item.id, item.title)}
                                                    >
                                                        <HiXCircle className="w-4 h-4 mr-2" />
                                                        Close Feedback
                                                    </Dropdown.Item>
                                                ) : (
                                                    <Dropdown.Item
                                                        eventKey="reopen"
                                                        onSelect={() => handleReopenFeedback(item.id, item.title)}
                                                    >
                                                        <HiCheckCircle className="w-4 h-4 mr-2" />
                                                        Reopen Feedback
                                                    </Dropdown.Item>
                                                )}
                                                <Dropdown.Item
                                                    eventKey="delete"
                                                    onSelect={() => handleDeleteFeedback(item.id, item.title)}
                                                    className="text-red-600"
                                                >
                                                    <HiTrash className="w-4 h-4 mr-2" />
                                                    Delete
                                                </Dropdown.Item>
                                            </Dropdown>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button
                                variant="twoTone"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="twoTone"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                                    <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <Button
                                        variant="twoTone"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-l-md"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="twoTone"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-r-md"
                                    >
                                        Next
                                    </Button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Feedback Detail Modal */}
            {showDetailModal && selectedFeedback && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="relative w-11/12 max-w-4xl max-h-[90vh] shadow-lg rounded-md bg-white flex flex-col">
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Feedback Details
                                </h3>
                            </div>

                            {/* Feedback Info */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Title</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedFeedback.title}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">User</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedFeedback.user_email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <div className="mt-1">{getTypeBadge(selectedFeedback.feedback_type)}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Created</label>
                                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedFeedback.created_at)}</p>
                                    </div>
                                    {selectedFeedback.closed_at && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Closed</label>
                                            <p className="mt-1 text-sm text-gray-900">{formatDate(selectedFeedback.closed_at)}</p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Message</label>
                                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedFeedback.message}</p>
                                </div>
                                {selectedFeedback.image_path && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">Image</label>
                                        <img 
                                            src={selectedFeedback.image_path} 
                                            alt="Feedback image" 
                                            className="mt-2 max-w-xs rounded-lg shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="mb-6">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Conversation</h4>
                                <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                                    {selectedFeedback.messages.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No messages yet</p>
                                    ) : (
                                        selectedFeedback.messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`p-4 rounded-lg ${
                                                    message.is_admin_message
                                                        ? 'bg-blue-50 border-l-4 border-blue-400'
                                                        : 'bg-gray-50 border-l-4 border-gray-400'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {message.user_email}
                                                        </span>
                                                        {message.is_admin_message && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(message.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.message}</p>
                                                {message.image_path && (
                                                    <img 
                                                        src={message.image_path} 
                                                        alt="Message image" 
                                                        className="mt-2 max-w-xs rounded-lg shadow-sm"
                                                    />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Add Message Form */}
                            {selectedFeedback.status === 'open' && (
                                <div className="border-t pt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Add Response</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <textarea
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Type your response..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setMessageImage(e.target.files?.[0] || null)}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                        <div className="flex justify-end space-x-3">
                                            <Button
                                                variant="twoTone"
                                                onClick={() => {
                                                    setNewMessage('')
                                                    setMessageImage(null)
                                                }}
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                variant="solid"
                                                onClick={handleSendMessage}
                                                loading={sendingMessage}
                                                disabled={!newMessage.trim() && !messageImage}
                                            >
                                                Send Message
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions - Fixed at bottom */}
                        <div className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-md">
                            <Button
                                variant="twoTone"
                                onClick={() => setShowDetailModal(false)}
                                className="flex items-center justify-center"
                            >
                                <HiXCircle className="w-4 h-4 mr-2" />
                                Close Modal
                            </Button>
                            <div className="flex space-x-3">
                                {selectedFeedback.status === 'open' ? (
                                    <Button
                                        variant="twoTone"
                                        onClick={() => handleCloseFeedback(selectedFeedback.id, selectedFeedback.title)}
                                        className="flex items-center justify-center"
                                    >
                                        <HiXCircle className="w-4 h-4 mr-2" />
                                        Close Feedback
                                    </Button>
                                ) : (
                                    <Button
                                        variant="twoTone"
                                        onClick={() => handleReopenFeedback(selectedFeedback.id, selectedFeedback.title)}
                                        className="flex items-center justify-center"
                                    >
                                        <HiCheckCircle className="w-4 h-4 mr-2" />
                                        Reopen Feedback
                                    </Button>
                                )}
                                <Button
                                    variant="solid"
                                    className="bg-red-600 hover:bg-red-700 flex items-center justify-center"
                                    onClick={() => handleDeleteFeedback(selectedFeedback.id, selectedFeedback.title)}
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

export default FeedbackManagement
