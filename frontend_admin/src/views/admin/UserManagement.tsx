import { useState, useEffect } from 'react'
import { Card, Input, Button, Select, Badge, Avatar, Dropdown, Dialog } from '@/components/ui'
import { HiOutlineSearch, HiDotsVertical, HiEye, HiPencil, HiTrash, HiCheckCircle, HiXCircle, HiUserAdd, HiArrowUp } from 'react-icons/hi'
import AdminService from '@/services/AdminService'
import type { AdminUser, UserListParams } from '@/@types/admin'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { toast } from 'react-hot-toast'

const UserManagement = () => {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<'admin' | 'user' | ''>('')
    const [statusFilter, setStatusFilter] = useState<'active' | 'disabled' | ''>('')
    const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<boolean | ''>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [pageSize] = useState(20)

    // Modal states
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning' as 'danger' | 'warning' | 'success' | 'info',
        onConfirm: () => {},
        isLoading: false
    })
    
    // User details modal
    const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const params: UserListParams = {
                page: currentPage,
                page_size: pageSize,
                search: searchTerm || undefined,
                role: roleFilter || undefined,
                disabled: statusFilter === 'disabled' || undefined,
                email_verified: emailVerifiedFilter !== '' ? emailVerifiedFilter : undefined
            }

            const response = await AdminService.getUsers(params)
            
            // Handle both array response and wrapped response
            const usersData = Array.isArray(response.data) ? response.data : response.data.users || []
            const totalCount = Array.isArray(response.data) ? response.data.length : response.data.total || 0
            
            setUsers(usersData)
            setTotalPages(Math.ceil(totalCount / pageSize))
        } catch (error) {
            toast.error('Failed to fetch users')
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [currentPage])

    const handleSearch = () => {
        setCurrentPage(1)
        fetchUsers()
    }

    const showConfirmModal = (title: string, message: string, type: 'danger' | 'warning' | 'success' | 'info', onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
            isLoading: false
        })
    }

    const handleDeleteUser = async (userId: string, userName: string) => {
        showConfirmModal(
            'Delete User',
            `Are you sure you want to delete user "${userName}"? This action cannot be undone and will permanently remove all user data.`,
            'danger',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminService.deleteUser(userId)
                    toast.success('User deleted successfully')
                    fetchUsers()
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to delete user')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleToggleUserStatus = async (userId: string, userName: string, currentStatus: boolean) => {
        // currentStatus represents if user is disabled
        const action = currentStatus ? 'enable' : 'disable'
        const actionText = currentStatus ? 'enable' : 'disable'
        
        showConfirmModal(
            `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
            `Are you sure you want to ${actionText} user "${userName}"?`,
            'warning',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    if (currentStatus) {
                        // User is currently disabled, so enable them
                        await AdminService.enableUser(userId)
                    } else {
                        // User is currently enabled, so disable them
                        await AdminService.disableUser(userId)
                    }
                    toast.success(`User ${actionText}d successfully`)
                    fetchUsers()
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error(`Failed to ${actionText} user`)
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleVerifyEmail = async (userId: string, userName: string) => {
        showConfirmModal(
            'Verify Email',
            `Are you sure you want to verify the email for user "${userName}"?`,
            'info',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminService.verifyUserEmail(userId)
                    toast.success('Email verified successfully')
                    fetchUsers()
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to verify email')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const handleUpdateRole = async (userId: string, userName: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin'
        const roleText = newRole === 'admin' ? 'administrator' : 'regular user'
        
        showConfirmModal(
            'Update User Role',
            `Are you sure you want to change "${userName}" role to ${roleText}?`,
            'warning',
            async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }))
                try {
                    await AdminService.updateUserRole(userId, newRole)
                    toast.success('User role updated successfully')
                    fetchUsers()
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                } catch (error) {
                    toast.error('Failed to update user role')
                    setConfirmModal(prev => ({ ...prev, isLoading: false }))
                }
            }
        )
    }

    const getRoleBadge = (role: string) => {
        return role === 'admin' ? (
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md border border-purple-200">
                👑 Admin
            </Badge>
        ) : (
            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md border border-blue-200">
                👤 User
            </Badge>
        )
    }

    const getStatusBadge = (disabled: boolean) => {
        return disabled ? (
            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md border border-red-200">
                ⛔ Disabled
            </Badge>
        ) : (
            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md border border-green-200">
                ✅ Active
            </Badge>
        )
    }

    const getEmailVerifiedBadge = (verified: boolean) => {
        return verified ? (
            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md border border-emerald-200">
                ✉️ Verified
            </Badge>
        ) : (
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md border border-amber-200">
                ⚠️ Unverified
            </Badge>
        )
    }

    const getDropdownActions = (user: AdminUser) => {
        const items = [
            {
                label: 'View Details',
                icon: <HiEye className="w-4 h-4" />,
                onClick: () => {
                    setSelectedUser(user)
                    setShowUserDetailsModal(true)
                }
            },
            {
                label: user.disabled ? 'Enable User' : 'Disable User',
                icon: user.disabled ? <HiCheckCircle className="w-4 h-4" /> : <HiXCircle className="w-4 h-4" />,
                onClick: () => handleToggleUserStatus(user.id, user.username, user.disabled)
            },
            {
                label: user.email_verified ? 'Email Verified' : 'Verify Email',
                icon: <HiCheckCircle className="w-4 h-4" />,
                onClick: user.email_verified ? undefined : () => handleVerifyEmail(user.id, user.username),
                disabled: user.email_verified
            },
            {
                label: `Make ${user.role === 'admin' ? 'Regular User' : 'Admin'}`,
                icon: <HiUserAdd className="w-4 h-4" />,
                onClick: () => handleUpdateRole(user.id, user.username, user.role)
            },
            {
                label: 'Delete User',
                icon: <HiTrash className="w-4 h-4" />,
                onClick: () => handleDeleteUser(user.id, user.username),
                className: 'text-red-600 hover:text-red-700'
            }
        ].filter(item => !item.disabled)

        return items
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600">Manage system users, roles, and permissions</p>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                prefix={<HiOutlineSearch className="w-4 h-4" />}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div>
                            <Select
                                value={[
                                    { label: 'All Roles', value: '' },
                                    { label: 'Admin', value: 'admin' },
                                    { label: 'User', value: 'user' }
                                ].find(opt => opt.value === roleFilter) || null}
                                onChange={(option) => setRoleFilter(option?.value || '')}
                                placeholder="Filter by role"
                                options={[
                                    { label: 'All Roles', value: '' },
                                    { label: 'Admin', value: 'admin' },
                                    { label: 'User', value: 'user' }
                                ]}
                            />
                        </div>
                        <div>
                            <Select
                                value={[
                                    { label: 'All Status', value: '' },
                                    { label: 'Active', value: 'active' },
                                    { label: 'Disabled', value: 'disabled' }
                                ].find(opt => opt.value === statusFilter) || null}
                                onChange={(option) => setStatusFilter(option?.value || '')}
                                placeholder="Filter by status"
                                options={[
                                    { label: 'All Status', value: '' },
                                    { label: 'Active', value: 'active' },
                                    { label: 'Disabled', value: 'disabled' }
                                ]}
                            />
                        </div>
                        <div>
                            <Select
                                value={[
                                    { label: 'All', value: '' },
                                    { label: 'Verified', value: true },
                                    { label: 'Unverified', value: false }
                                ].find(opt => opt.value === emailVerifiedFilter) || null}
                                onChange={(option) => setEmailVerifiedFilter(option?.value !== undefined ? option.value : '')}
                                placeholder="Filter by email verification"
                                options={[
                                    { label: 'All', value: '' },
                                    { label: 'Verified', value: true },
                                    { label: 'Unverified', value: false }
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end items-center mt-4 space-x-3">
                        <Button
                            variant="solid"
                            size="default"
                            onClick={handleSearch}
                            loading={loading}
                            className="px-6 py-2 flex justify-end items-center"
                        >
                            <HiOutlineSearch className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                        <Button
                            variant="outline"
                            size="default"
                            onClick={() => {
                                setSearchTerm('')
                                setRoleFilter('')
                                setStatusFilter('')
                                setEmailVerifiedFilter('')
                                setCurrentPage(1)
                                fetchUsers()
                            }}
                            className="px-6 py-2 flex justify-end items-center"
                        >
                            <HiArrowUp className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Users Table */}
            <Card>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Enabled
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Avatar
                                                        src=""
                                                        alt={user.username}
                                                        size={40}
                                                        className="mr-3"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.username}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {user.email}
                                                        </div>
                                                        {(user.first_name || user.last_name) && (
                                                            <div className="text-xs text-gray-400">
                                                                {user.first_name} {user.last_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getRoleBadge(user.role)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(user.disabled)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getEmailVerifiedBadge(user.email_verified)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-20">
                                                <Dropdown
                                                    renderTitle={
                                                        <Button
                                                            variant="plain"
                                                            size="sm"
                                                            icon={<HiDotsVertical />}
                                                        />
                                                    }
                                                    className="ml-auto"
                                                    placement="bottom-end"
                                                >
                                                    {getDropdownActions(user).map((action, index) => (
                                                        <Dropdown.Item
                                                            key={index}
                                                            eventKey={index}
                                                            onClick={action.onClick}
                                                            className={action.className}
                                                        >
                                                            {action.icon}
                                                            <span className="ml-2">{action.label}</span>
                                                        </Dropdown.Item>
                                                    ))}
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
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-gray-700">
                                Showing page {currentPage} of {totalPages}
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

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

            {/* User Details Modal */}
            <Dialog
                isOpen={showUserDetailsModal}
                onRequestClose={() => {
                    setShowUserDetailsModal(false)
                    setSelectedUser(null)
                }}
                width={600}
            >
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        User Details
                    </h2>
                    
                    {selectedUser && (
                        <div className="space-y-6">
                            {/* User Avatar and Basic Info */}
                            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                <Avatar
                                    src=""
                                    alt={selectedUser.username}
                                    size={80}
                                />
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {selectedUser.username}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {selectedUser.email}
                                    </p>
                                    {(selectedUser.first_name || selectedUser.last_name) && (
                                        <p className="text-sm text-gray-500">
                                            {selectedUser.first_name} {selectedUser.last_name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* User Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            User ID
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            <span className="text-sm font-mono text-gray-900">
                                                {selectedUser.id}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Role
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            {getRoleBadge(selectedUser.role)}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Account Status
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            {getStatusBadge(selectedUser.disabled)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Verification
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            {getEmailVerifiedBadge(selectedUser.email_verified)}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Username
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            <span className="text-sm text-gray-900">
                                                {selectedUser.username}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Address
                                        </label>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            <span className="text-sm text-gray-900">
                                                {selectedUser.email}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="border-t pt-6">
                                <h4 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h4>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowUserDetailsModal(false)
                                            handleToggleUserStatus(selectedUser.id, selectedUser.username, selectedUser.disabled)
                                        }}
                                    >
                                        {selectedUser.disabled ? 'Enable User' : 'Disable User'}
                                    </Button>
                                    
                                    {!selectedUser.email_verified && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setShowUserDetailsModal(false)
                                                handleVerifyEmail(selectedUser.id, selectedUser.username)
                                            }}
                                        >
                                            Verify Email
                                        </Button>
                                    )}
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowUserDetailsModal(false)
                                            handleUpdateRole(selectedUser.id, selectedUser.username, selectedUser.role)
                                        }}
                                    >
                                        Change Role
                                    </Button>
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowUserDetailsModal(false)
                                            handleDeleteUser(selectedUser.id, selectedUser.username)
                                        }}
                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                    >
                                        Delete User
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal Actions */}
                    <div className="flex justify-end pt-6 border-t mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowUserDetailsModal(false)
                                setSelectedUser(null)
                            }}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default UserManagement
