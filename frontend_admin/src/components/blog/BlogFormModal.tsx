import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { HiX, HiPlus, HiTrash, HiUpload, HiCamera } from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { BlogPost, BlogPostCreate, BlogPostUpdate, BlogContentBlock, BLOG_CATEGORIES, COMMON_BLOG_TAGS } from '@/@types/blog'
import AdminBlogService from '@/services/AdminBlogService'
import { RootState } from '@/store'

interface BlogFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: BlogPostCreate | BlogPostUpdate) => Promise<void>
    initialData?: BlogPost | null
    loading?: boolean
}

const BlogFormModal: React.FC<BlogFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    loading = false
}) => {
    const [formData, setFormData] = useState<BlogPostCreate>({
        title: '',
        slug: '',
        summary: '',
        featured_image_url: '',
        content: {
            summary: '',
            body: []
        },
        author_name: '',
        author_email: '',
        category: 'General',
        tags: [],
        is_published: false,
        meta_description: '',
        meta_keywords: ''
    })

    const [newTag, setNewTag] = useState('')
    const [newBlockType, setNewBlockType] = useState<'heading' | 'paragraph' | 'code' | 'list' | 'quote' | 'image'>('paragraph')
    const [newBlockText, setNewBlockText] = useState('')
    const [newBlockLevel, setNewBlockLevel] = useState(2)
    const [newBlockLanguage, setNewBlockLanguage] = useState('')
    const [newBlockUrl, setNewBlockUrl] = useState('')
    const [newBlockAlt, setNewBlockAlt] = useState('')
    const [newBlockCaption, setNewBlockCaption] = useState('')
    const [newBlockAuthor, setNewBlockAuthor] = useState('')
    const [newBlockStyle, setNewBlockStyle] = useState<'ordered' | 'unordered'>('unordered')
    const [newBlockItems, setNewBlockItems] = useState<string[]>([''])
    
    // Image upload states
    const [uploadingImage, setUploadingImage] = useState(false)
    const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null)
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('')
    const [contentImageFile, setContentImageFile] = useState<File | null>(null)
    const [contentImagePreview, setContentImagePreview] = useState<string>('')
    const featuredImageInputRef = useRef<HTMLInputElement>(null)
    const contentImageInputRef = useRef<HTMLInputElement>(null)

    // Author info checkbox state
    const [useCurrentAdminInfo, setUseCurrentAdminInfo] = useState(false)
    
    // Get current admin user data from Redux
    const currentUser = useSelector((state: RootState) => state.auth.user)

    // Handle checkbox change to auto-fill author info
    useEffect(() => {
        if (useCurrentAdminInfo && currentUser) {
            setFormData(prev => ({
                ...prev,
                author_name: currentUser.userName || currentUser.email || '',
                author_email: currentUser.email || ''
            }))
        }
    }, [useCurrentAdminInfo, currentUser])

    // Initialize form data when modal opens or initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                slug: initialData.slug,
                summary: initialData.summary,
                featured_image_url: initialData.featured_image_url || '',
                content: {
                    summary: '',
                    body: initialData.content.body
                },
                author_name: initialData.author_name,
                author_email: initialData.author_email,
                category: initialData.category,
                tags: initialData.tags,
                is_published: initialData.is_published,
                meta_description: initialData.meta_description || '',
                meta_keywords: initialData.meta_keywords || ''
            })
        } else {
            // Reset form for new post
            setFormData({
                title: '',
                slug: '',
                summary: '',
                featured_image_url: '',
                content: {
                    summary: '',
                    body: []
                },
                author_name: '',
                author_email: '',
                category: 'General',
                tags: [],
                is_published: false,
                meta_description: '',
                meta_keywords: ''
            })
        }
    }, [initialData, isOpen])

    // Auto-generate slug from title
    useEffect(() => {
        if (!initialData && formData.title) {
            const slug = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
            setFormData(prev => ({ ...prev, slug }))
        }
    }, [formData.title, initialData])

    const handleInputChange = (field: keyof BlogPostCreate, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleContentChange = (field: keyof BlogPostCreate['content'], value: any) => {
        setFormData(prev => ({
            ...prev,
            content: { ...prev.content, [field]: value }
        }))
    }

    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }))
            setNewTag('')
        }
    }

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }))
    }

    const addContentBlock = () => {
        console.log('Add Block clicked, type:', newBlockType, 'text:', newBlockText, 'items:', newBlockItems)
        let newBlock: BlogContentBlock | null = null

        switch (newBlockType) {
            case 'heading':
                if (newBlockText.trim()) {
                    newBlock = {
                        type: 'heading',
                        text: newBlockText.trim(),
                        level: newBlockLevel
                    }
                }
                break

            case 'paragraph':
                if (newBlockText.trim()) {
                    newBlock = {
                        type: 'paragraph',
                        text: newBlockText.trim()
                    }
                }
                break

            case 'code':
                if (newBlockText.trim()) {
                    newBlock = {
                        type: 'code',
                        content: newBlockText.trim(),
                        language: newBlockLanguage || 'text'
                    }
                }
                break

            case 'list':
                const filteredItems = newBlockItems.filter(item => item.trim())
                if (filteredItems.length > 0) {
                    newBlock = {
                        type: 'list',
                        items: filteredItems,
                        style: newBlockStyle
                    }
                }
                break

            case 'quote':
                if (newBlockText.trim()) {
                    newBlock = {
                        type: 'quote',
                        text: newBlockText.trim(),
                        author: newBlockAuthor || undefined
                    }
                }
                break

            case 'image':
                if (newBlockUrl.trim()) {
                    newBlock = {
                        type: 'image',
                        url: newBlockUrl.trim(),
                        alt: newBlockAlt || undefined,
                        caption: newBlockCaption || undefined
                    }
                } else {
                    toast.error('Please upload an image first')
                    return
                }
                break

            default:
                console.log('Unknown block type:', newBlockType)
                return
        }

        if (!newBlock) {
            console.log('No block created - validation failed')
            toast.error('Please fill in the required fields for this block type')
            return
        }

        console.log('Adding block:', newBlock)
        setFormData(prev => ({
            ...prev,
            content: {
                ...prev.content,
                body: [...prev.content.body, newBlock!]
            }
        }))

        // Reset form
        setNewBlockText('')
        setNewBlockLanguage('')
        setNewBlockUrl('')
        setNewBlockAlt('')
        setNewBlockCaption('')
        setNewBlockAuthor('')
        setNewBlockItems([''])
        
        console.log('Block added successfully')
    }

    const removeContentBlock = (index: number) => {
        setFormData(prev => ({
            ...prev,
            content: {
                ...prev.content,
                body: prev.content.body.filter((_, i) => i !== index)
            }
        }))
    }

    // Image upload functions
    const handleFeaturedImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast.error('File size must be less than 10MB')
                return
            }
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file')
                return
            }
            setFeaturedImageFile(file)
            const reader = new FileReader()
            reader.onload = (e) => {
                setFeaturedImagePreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleContentImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast.error('File size must be less than 10MB')
                return
            }
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file')
                return
            }
            setContentImageFile(file)
            const reader = new FileReader()
            reader.onload = (e) => {
                setContentImagePreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const uploadFeaturedImage = async () => {
        if (!featuredImageFile) return

        setUploadingImage(true)
        try {
            const response = await AdminBlogService.uploadBlogImage(featuredImageFile)
            if (response.data) {
                handleInputChange('featured_image_url', response.data.url)
                toast.success('Featured image uploaded successfully')
                setFeaturedImageFile(null)
                setFeaturedImagePreview('')
                if (featuredImageInputRef.current) {
                    featuredImageInputRef.current.value = ''
                }
            }
        } catch (error) {
            toast.error('Failed to upload featured image')
            console.error('Error uploading featured image:', error)
        } finally {
            setUploadingImage(false)
        }
    }

    const uploadContentImage = async () => {
        if (!contentImageFile) return

        setUploadingImage(true)
        try {
            const response = await AdminBlogService.uploadBlogImage(contentImageFile)
            if (response.data) {
                setNewBlockUrl(response.data.url)
                toast.success('Content image uploaded successfully')
                setContentImageFile(null)
                setContentImagePreview('')
                if (contentImageInputRef.current) {
                    contentImageInputRef.current.value = ''
                }
            }
        } catch (error) {
            toast.error('Failed to upload content image')
            console.error('Error uploading content image:', error)
        } finally {
            setUploadingImage(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Form submitted with data:', formData)
        
        if (!formData.title.trim() || !formData.slug.trim() || !formData.summary.trim()) {
            toast.error('Please fill in all required fields')
            return
        }

        if (formData.content.body.length === 0) {
            toast.error('Please add at least one content block')
            return
        }

        try {
            console.log('Calling onSubmit with:', formData)
            await onSubmit(formData)
            onClose()
        } catch (error) {
            console.error('Error submitting form:', error)
            // Error handling is done in parent component
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="relative w-11/12 max-w-4xl max-h-[90vh] shadow-lg rounded-md bg-white flex flex-col">
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                            {initialData ? 'Edit Blog Post' : 'Create New Blog Post'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <HiX className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Title *
                                </label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder="Enter blog post title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slug *
                                </label>
                                <Input
                                    value={formData.slug}
                                    onChange={(e) => handleInputChange('slug', e.target.value)}
                                    placeholder="blog-post-slug"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Summary *
                            </label>
                            <Input
                                textArea
                                value={formData.summary}
                                onChange={(e) => handleInputChange('summary', e.target.value)}
                                placeholder="Brief summary of the blog post"
                                rows={3}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Featured Image
                            </label>
                            
                            {/* Featured Image Upload */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <input
                                        ref={featuredImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFeaturedImageChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="twoTone"
                                        onClick={() => featuredImageInputRef.current?.click()}
                                        className="flex items-center"
                                        size="sm"
                                    >
                                        <HiUpload className="w-4 h-4 mr-2" />
                                        Choose Image
                                    </Button>
                                    {featuredImageFile && (
                                        <Button
                                            type="button"
                                            variant="solid"
                                            onClick={uploadFeaturedImage}
                                            loading={uploadingImage}
                                            className="flex items-center"
                                            size="sm"
                                        >
                                            <HiCamera className="w-4 h-4 mr-2" />
                                            Upload
                                        </Button>
                                    )}
                                </div>

                                {/* Featured Image Preview */}
                                {featuredImagePreview && (
                                    <div className="border rounded-lg p-3">
                                        <img
                                            src={featuredImagePreview}
                                            alt="Featured image preview"
                                            className="max-w-full h-32 object-cover rounded"
                                        />
                                        <p className="text-sm text-gray-600 mt-2">
                                            {featuredImageFile?.name} ({(featuredImageFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                                        </p>
                                    </div>
                                )}

                                {/* Current Featured Image */}
                                {formData.featured_image_url && !featuredImagePreview && (
                                    <div className="border rounded-lg p-3">
                                        <img
                                            src={formData.featured_image_url}
                                            alt="Current featured image"
                                            className="max-w-full h-32 object-cover rounded"
                                        />
                                        <p className="text-sm text-gray-600 mt-2">
                                            Current featured image
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Author Information */}
                        <div className="space-y-4">
                            {/* Use Current Admin Info Checkbox */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="useCurrentAdminInfo"
                                    checked={useCurrentAdminInfo}
                                    onChange={(e) => setUseCurrentAdminInfo(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="useCurrentAdminInfo" className="ml-2 block text-sm text-gray-900">
                                    Use current admin info
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Author Name *
                                    </label>
                                    <Input
                                        value={formData.author_name}
                                        onChange={(e) => handleInputChange('author_name', e.target.value)}
                                        placeholder="Author Name"
                                        disabled={useCurrentAdminInfo}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Author Email *
                                    </label>
                                    <Input
                                        value={formData.author_email}
                                        onChange={(e) => handleInputChange('author_email', e.target.value)}
                                        placeholder="author@example.com"
                                        type="email"
                                        disabled={useCurrentAdminInfo}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category and Tags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <Select
                                    value={[
                                        { label: 'General', value: 'General' },
                                        ...BLOG_CATEGORIES.filter(cat => cat !== 'General').map(cat => ({ label: cat, value: cat }))
                                    ].find(opt => opt.value === formData.category) || null}
                                    onChange={(option) => handleInputChange('category', option?.value || 'General')}
                                    placeholder="Select category"
                                    options={[
                                        { label: 'General', value: 'General' },
                                        ...BLOG_CATEGORIES.filter(cat => cat !== 'General').map(cat => ({ label: cat, value: cat }))
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Add tag"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    />
                                    <Button type="button" onClick={addTag} size="sm">
                                        <HiPlus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="ml-1 text-blue-600 hover:text-blue-800"
                                            >
                                                <HiTrash className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>


                        {/* Content Blocks */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Content Blocks
                            </label>
                            
                            {/* Add New Block */}
                            <div className="border border-gray-200 rounded-lg p-4 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                    <Select
                                        value={[
                                            { label: 'Heading', value: 'heading' },
                                            { label: 'Paragraph', value: 'paragraph' },
                                            { label: 'Code', value: 'code' },
                                            { label: 'List', value: 'list' },
                                            { label: 'Quote', value: 'quote' },
                                            { label: 'Image', value: 'image' }
                                        ].find(opt => opt.value === newBlockType) || null}
                                        onChange={(option) => setNewBlockType(option?.value as any || 'paragraph')}
                                        placeholder="Block type"
                                        options={[
                                            { label: 'Heading', value: 'heading' },
                                            { label: 'Paragraph', value: 'paragraph' },
                                            { label: 'Code', value: 'code' },
                                            { label: 'List', value: 'list' },
                                            { label: 'Quote', value: 'quote' },
                                            { label: 'Image', value: 'image' }
                                        ]}
                                    />
                                    {newBlockType === 'heading' && (
                                        <Select
                                            value={{ label: `H${newBlockLevel}`, value: newBlockLevel.toString() }}
                                            onChange={(option) => setNewBlockLevel(parseInt(option?.value || '2'))}
                                            placeholder="Level"
                                            options={[
                                                { label: 'H1', value: '1' },
                                                { label: 'H2', value: '2' },
                                                { label: 'H3', value: '3' },
                                                { label: 'H4', value: '4' }
                                            ]}
                                        />
                                    )}
                                    {newBlockType === 'code' && (
                                        <Input
                                            value={newBlockLanguage}
                                            onChange={(e) => setNewBlockLanguage(e.target.value)}
                                            placeholder="Language (e.g., python, javascript)"
                                        />
                                    )}
                                    {newBlockType === 'list' && (
                                        <Select
                                            value={{ label: newBlockStyle === 'ordered' ? 'Ordered List' : 'Unordered List', value: newBlockStyle }}
                                            onChange={(option) => setNewBlockStyle(option?.value as any || 'unordered')}
                                            placeholder="List type"
                                            options={[
                                                { label: 'Unordered List', value: 'unordered' },
                                                { label: 'Ordered List', value: 'ordered' }
                                            ]}
                                        />
                                    )}
                                </div>
                                {/* Content Input */}
                                {newBlockType === 'list' ? (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">List Items</label>
                                        {newBlockItems.map((item, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input
                                                    value={item}
                                                    onChange={(e) => {
                                                        const newItems = [...newBlockItems]
                                                        newItems[index] = e.target.value
                                                        setNewBlockItems(newItems)
                                                    }}
                                                    placeholder={`Item ${index + 1}`}
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        const newItems = newBlockItems.filter((_, i) => i !== index)
                                                        setNewBlockItems(newItems)
                                                    }}
                                                    size="sm"
                                                    variant="twoTone"
                                                    color="red"
                                                >
                                                    <HiTrash className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            onClick={() => setNewBlockItems([...newBlockItems, ''])}
                                            size="sm"
                                            variant="twoTone"
                                        >
                                            <HiPlus className="w-4 h-4 mr-2" />
                                            Add Item
                                        </Button>
                                    </div>
                                ) : newBlockType === 'image' ? (
                                    <div className="space-y-3">
                                        {/* Image Upload Section */}
                                        <div className="flex items-center space-x-3">
                                            <input
                                                ref={contentImageInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleContentImageChange}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="twoTone"
                                                onClick={() => contentImageInputRef.current?.click()}
                                                className="flex items-center"
                                                size="sm"
                                            >
                                                <HiUpload className="w-4 h-4 mr-2" />
                                                Choose Image
                                            </Button>
                                            {contentImageFile && (
                                                <Button
                                                    type="button"
                                                    variant="solid"
                                                    onClick={uploadContentImage}
                                                    loading={uploadingImage}
                                                    className="flex items-center"
                                                    size="sm"
                                                >
                                                    <HiCamera className="w-4 h-4 mr-2" />
                                                    Upload
                                                </Button>
                                            )}
                                        </div>

                                        {/* Image Preview */}
                                        {contentImagePreview && (
                                            <div className="border rounded-lg p-3">
                                                <img
                                                    src={contentImagePreview}
                                                    alt="Image preview"
                                                    className="max-w-full h-32 object-cover rounded"
                                                />
                                                <p className="text-sm text-gray-600 mt-2">
                                                    {contentImageFile?.name} ({(contentImageFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                                                </p>
                                            </div>
                                        )}


                                        <Input
                                            value={newBlockAlt}
                                            onChange={(e) => setNewBlockAlt(e.target.value)}
                                            placeholder="Alt text"
                                        />
                                        <Input
                                            value={newBlockCaption}
                                            onChange={(e) => setNewBlockCaption(e.target.value)}
                                            placeholder="Caption (optional)"
                                        />
                                    </div>
                                ) : newBlockType === 'quote' ? (
                                    <div className="space-y-2">
                                        <Input
                                            textArea
                                            value={newBlockText}
                                            onChange={(e) => setNewBlockText(e.target.value)}
                                            placeholder="Quote text..."
                                            rows={3}
                                        />
                                        <Input
                                            value={newBlockAuthor}
                                            onChange={(e) => setNewBlockAuthor(e.target.value)}
                                            placeholder="Author (optional)"
                                        />
                                    </div>
                                ) : (
                                    <Input
                                        textArea
                                        value={newBlockText}
                                        onChange={(e) => setNewBlockText(e.target.value)}
                                        placeholder="Enter content..."
                                        rows={newBlockType === 'code' ? 6 : 3}
                                    />
                                )}
                                <Button
                                    type="button"
                                    onClick={addContentBlock}
                                    className="mt-2 flex items-center"
                                    size="sm"
                                >
                                    <HiPlus className="w-4 h-4 mr-2" />
                                    Add Block
                                </Button>
                            </div>

                            {/* Existing Blocks */}
                            <div className="space-y-3">
                                {formData.content.body.map((block, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm font-medium text-gray-600">
                                                {block.type === 'heading' ? `H${block.level} Heading` : 
                                                 block.type === 'code' ? `Code (${block.language})` : 
                                                 'Paragraph'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeContentBlock(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <HiTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-800">
                                            {block.type === 'code' ? (
                                                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                                    {block.content}
                                                </pre>
                                            ) : block.type === 'heading' && block.level ? (
                                                <div className={`font-bold mb-1 ${
                                                    block.level === 1 ? 'text-xl' :
                                                    block.level === 2 ? 'text-lg' :
                                                    block.level === 3 ? 'text-base' : 'text-sm'
                                                }`}>
                                                    {block.text}
                                                </div>
                                            ) : block.type === 'paragraph' ? (
                                                <div>{block.text}</div>
                                            ) : block.type === 'list' ? (
                                                <div>
                                                    {block.style === 'ordered' ? (
                                                        <ol className="list-decimal list-inside space-y-1">
                                                            {block.items?.map((item, index) => (
                                                                <li key={index}>{item}</li>
                                                            ))}
                                                        </ol>
                                                    ) : (
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {block.items?.map((item, index) => (
                                                                <li key={index}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ) : block.type === 'quote' ? (
                                                <div className="border-l-4 border-gray-300 pl-4 italic">
                                                    <div>"{block.text}"</div>
                                                    {block.author && (
                                                        <div className="text-gray-600 text-xs mt-1">— {block.author}</div>
                                                    )}
                                                </div>
                                            ) : block.type === 'image' ? (
                                                <div>
                                                    <img 
                                                        src={block.url} 
                                                        alt={block.alt || ''} 
                                                        className="max-w-full h-auto rounded"
                                                        style={{ maxHeight: '200px' }}
                                                    />
                                                    {block.caption && (
                                                        <div className="text-gray-600 text-xs mt-1 italic">{block.caption}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>{block.text}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SEO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meta Description
                                </label>
                                <Input
                                    textArea
                                    value={formData.meta_description}
                                    onChange={(e) => handleInputChange('meta_description', e.target.value)}
                                    placeholder="SEO meta description"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meta Keywords
                                </label>
                                <Input
                                    value={formData.meta_keywords}
                                    onChange={(e) => handleInputChange('meta_keywords', e.target.value)}
                                    placeholder="keyword1, keyword2, keyword3"
                                />
                            </div>
                        </div>

                        {/* Publish Status */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_published"
                                checked={formData.is_published}
                                onChange={(e) => handleInputChange('is_published', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900">
                                Publish immediately
                            </label>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end items-center pt-6 border-t">
                            <Button
                                type="button"
                                variant="twoTone"
                                onClick={onClose}
                                className="mr-3 flex items-center"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="solid"
                                loading={loading}
                                className="flex items-center"
                            >
                                {initialData ? 'Update Post' : 'Create Post'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default BlogFormModal
