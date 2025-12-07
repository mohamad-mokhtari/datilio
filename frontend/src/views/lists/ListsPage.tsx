import { useState, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hook'
import ApiService2 from '@/services/ApiService2'
import { ListItem } from '@/@types/lists'
import { fetchUserLists } from '@/store/slices/lists/listsSlice'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Upload from '@/components/ui/Upload'
import { HiPlus, HiUpload } from 'react-icons/hi'

const { Tr, Th, Td, THead, TBody } = Table

interface CreateListPayload {
    name: string;
    items: string[];
}

interface CreateListResponse {
    status: string;
    list_id: string;
}

interface BatchUploadResponse {
    status: string;
    list_id: string;
    item_count: number;
}

interface AddItemResponse {
    status: string;
    item_id: string;
}

const ListsPage = () => {
    const dispatch = useAppDispatch()
    const { userLists, loading, error } = useAppSelector((state) => state.lists.lists)
    
    // View items state
    const [selectedList, setSelectedList] = useState<string | null>(null)
    const [selectedListName, setSelectedListName] = useState<string>('')
    const [listItems, setListItems] = useState<ListItem[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loadingItems, setLoadingItems] = useState(false)
    const [itemsError, setItemsError] = useState<string | null>(null)

    // Create list state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newListName, setNewListName] = useState('')
    const [newListItems, setNewListItems] = useState([''])
    const [creatingList, setCreatingList] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    // Batch upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Add item state
    const [newItemValue, setNewItemValue] = useState('')
    const [addingItem, setAddingItem] = useState(false)
    const [addItemError, setAddItemError] = useState<string | null>(null)

    const handleViewItems = async (listId: string, listName: string) => {
        setSelectedList(listId)
        setSelectedListName(listName)
        setIsModalOpen(true)
        setListItems([])
        setItemsError(null)
        setLoadingItems(true)
        setNewItemValue('')
        setAddItemError(null)

        try {
            const response = await ApiService2.get<ListItem[]>(`/lists/users/lists/${listId}/items/`)
            setListItems(response.data)
        } catch (error) {
            console.error('Failed to fetch list items:', error)
            setItemsError('Failed to load list items. Please try again.')
        } finally {
            setLoadingItems(false)
        }
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedList(null)
        setListItems([])
        setNewItemValue('')
    }

    const openCreateModal = () => {
        setIsCreateModalOpen(true)
        setNewListName('')
        setNewListItems([''])
        setCreateError(null)
    }

    const closeCreateModal = () => {
        setIsCreateModalOpen(false)
    }

    const handleItemChange = (index: number, value: string) => {
        const updatedItems = [...newListItems]
        updatedItems[index] = value
        setNewListItems(updatedItems)
    }

    const addItemField = () => {
        setNewListItems([...newListItems, ''])
    }

    const removeItemField = (index: number) => {
        if (newListItems.length > 1) {
            const updatedItems = [...newListItems]
            updatedItems.splice(index, 1)
            setNewListItems(updatedItems)
        }
    }

    const handleCreateList = async () => {
        // Validate inputs
        if (!newListName.trim()) {
            setCreateError('List name is required')
            return
        }

        // Filter out empty items
        const filteredItems = newListItems.filter(item => item.trim() !== '')
        if (filteredItems.length === 0) {
            setCreateError('At least one item is required')
            return
        }

        setCreatingList(true)
        setCreateError(null)

        const payload: CreateListPayload = {
            name: newListName.trim(),
            items: filteredItems
        }

        try {
            const response = await ApiService2.post<CreateListResponse>('/lists/users/lists/', payload)
            
            if (response.data.status === 'success') {
                toast.push(
                    <Notification title="Success" type="success">
                        List created successfully
                    </Notification>
                )
                // Refresh the lists
                dispatch(fetchUserLists())
                closeCreateModal()
            } else {
                setCreateError('Failed to create list')
            }
        } catch (error) {
            console.error('Failed to create list:', error)
            setCreateError('Failed to create list. Please try again.')
        } finally {
            setCreatingList(false)
        }
    }

    // Batch upload functions
    const openUploadModal = () => {
        setIsUploadModalOpen(true)
        setUploadFile(null)
        setUploadError(null)
    }

    const closeUploadModal = () => {
        setIsUploadModalOpen(false)
    }

    const handleFileChange = (files: File[], fileList: File[]) => {
        if (files.length > 0) {
            setUploadFile(files[0])
        }
    }

    const beforeUpload = (files: FileList | null, fileList: File[]) => {
        let valid: string | boolean = true

        const allowedFileTypes = ['text/csv', 'application/json']
        const maxFileSize = 5000000 // 5MB

        if (files) {
            for (const file of files) {
                if (!allowedFileTypes.includes(file.type)) {
                    valid = 'Please upload a CSV or JSON file!'
                }

                if (file.size > maxFileSize) {
                    valid = 'File size cannot be more than 5MB!'
                }
            }
        }

        return valid
    }

    const handleUploadList = async () => {
        if (!uploadFile) {
            setUploadError('Please select a file to upload')
            return
        }

        setUploading(true)
        setUploadError(null)

        const formData = new FormData()
        formData.append('file', uploadFile)

        try {
            const response = await ApiService2.post<BatchUploadResponse>(
                '/lists/users/lists/upload/', 
                formData
            )
            
            if (response.data.status === 'success') {
                toast.push(
                    <Notification title="Success" type="success">
                        List uploaded successfully with {response.data.item_count} items
                    </Notification>
                )
                // Refresh the lists
                dispatch(fetchUserLists())
                closeUploadModal()
            } else {
                setUploadError('Failed to upload list')
            }
        } catch (error) {
            console.error('Failed to upload list:', error)
            setUploadError('Failed to upload list. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    // Add new item to existing list
    const handleAddItem = async () => {
        if (!selectedList) {
            return
        }

        if (!newItemValue.trim()) {
            setAddItemError('Item value cannot be empty')
            return
        }

        setAddingItem(true)
        setAddItemError(null)

        try {
            const response = await ApiService2.post<AddItemResponse>(
                `/lists/users/lists/${selectedList}/items/?item_value=${encodeURIComponent(newItemValue.trim())}`
            )
            
            if (response.data.status === 'success') {
                // Add the new item to the local state to avoid refetching
                const newItem: ListItem = {
                    id: response.data.item_id,
                    list_id: selectedList,
                    value: newItemValue.trim()
                }
                
                setListItems([...listItems, newItem])
                setNewItemValue('')
                
                toast.push(
                    <Notification title="Success" type="success">
                        Item added successfully
                    </Notification>
                )
            } else {
                setAddItemError('Failed to add item')
            }
        } catch (error) {
            console.error('Failed to add item:', error)
            setAddItemError('Failed to add item. Please try again.')
        } finally {
            setAddingItem(false)
        }
    }

    return (
        <Container>
            <div className="flex justify-between items-center mb-4">
                <h3>User Lists</h3>
                <div>
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<HiUpload />}
                        onClick={openUploadModal}
                        className="mr-2"
                    >
                        Batch Upload
                    </Button>
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<HiPlus />}
                        onClick={openCreateModal}
                    >
                        Create New List
                    </Button>
                </div>
            </div>
            
            <Card headerBorder footerBorder={false}>
                {error && (
                    <div className="text-center text-danger mb-4">{error}</div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <Spinner size={40} />
                        <p className="ml-2">Loading lists...</p>
                    </div>
                ) : userLists.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <THead>
                                <Tr>
                                    <Th>List Name</Th>
                                    <Th className="w-48 text-center">Actions</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {userLists.map((list, index) => (
                                    <Tr 
                                        key={list.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                                    >
                                        <Td>
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-3"></div>
                                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                                    {list.name}
                                                </span>
                                            </div>
                                        </Td>
                                        <Td className="text-center">
                                            <Button
                                                size="sm"
                                                variant="solid"
                                                onClick={() => handleViewItems(list.id, list.name)}
                                                className="shadow-sm hover:shadow-md transition-shadow duration-200"
                                            >
                                                View Items
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-5">No lists found. Create your first list!</div>
                )}
            </Card>

            {/* View List Items Modal */}
            <Dialog
                isOpen={isModalOpen}
                onClose={closeModal}
                width={700}
                closable
            >
                <div className="p-5">
                    <h5 className="mb-4 text-lg font-semibold">{selectedListName}</h5>
                    
                    {itemsError && (
                        <div className="text-center text-danger mb-4 p-2 bg-red-50 rounded-md">{itemsError}</div>
                    )}

                    {loadingItems ? (
                        <div className="flex justify-center items-center py-8">
                            <Spinner size={30} />
                            <p className="ml-2">Loading items...</p>
                        </div>
                    ) : (
                        <>
                            {/* Add new item form */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
                                <h6 className="mb-3 font-semibold text-gray-700">Add New Item</h6>
                                
                                {addItemError && (
                                    <div className="text-danger mb-3 p-2 bg-red-50 rounded-md text-sm">{addItemError}</div>
                                )}
                                
                                <div className="flex items-center">
                                    <Input
                                        className="flex-grow mr-2"
                                        value={newItemValue}
                                        onChange={(e) => setNewItemValue(e.target.value)}
                                        placeholder="Enter new item value"
                                        disabled={addingItem}
                                        size="md"
                                    />
                                    <Button
                                        size="md"
                                        variant="solid"
                                        icon={<HiPlus />}
                                        onClick={handleAddItem}
                                        loading={addingItem}
                                        disabled={!newItemValue.trim()}
                                    >
                                        Add Item
                                    </Button>
                                </div>
                            </div>

                            <div className="mb-3 flex justify-between items-center">
                                <h6 className="font-semibold text-gray-700">List Items ({listItems.length})</h6>
                                <Button
                                    size="sm"
                                    variant="plain"
                                    onClick={closeModal}
                                >
                                    Close
                                </Button>
                            </div>

                            {listItems.length > 0 ? (
                                <div className="max-h-96 overflow-y-auto border rounded-lg">
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Item ID</Th>
                                                <Th>Value</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {listItems.map((item) => (
                                                <Tr key={item.id} className="hover:bg-gray-50">
                                                    <Td className="text-xs text-gray-500">{item.id}</Td>
                                                    <Td>{item.value}</Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">No items found in this list.</p>
                                    <p className="text-sm text-gray-400 mt-1">Add your first item using the form above.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Dialog>

            {/* Create List Modal */}
            <Dialog
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                width={700}
                closable
            >
                <div className="p-5">
                    <h5 className="mb-4 text-lg font-semibold">Create New List</h5>
                    
                    {createError && (
                        <div className="text-center text-danger mb-4 p-2 bg-red-50 rounded-md">{createError}</div>
                    )}

                    <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                        <label className="form-label mb-2 font-medium">List Name</label>
                        <Input 
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="Enter list name"
                            className="w-full"
                            size="md"
                        />
                    </div>

                    <div className="mb-5">
                        <div className="flex justify-between items-center mb-3">
                            <label className="form-label font-medium">List Items</label>
                            <Button 
                                size="sm" 
                                variant="solid" 
                                icon={<HiPlus />}
                                onClick={addItemField}
                            >
                                Add Item
                            </Button>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                            {newListItems.map((item, index) => (
                                <div key={index} className="flex items-center mb-3 bg-white p-2 rounded shadow-sm">
                                    <div className="w-6 text-gray-400 mr-2">{index + 1}.</div>
                                    <Input 
                                        className="flex-grow"
                                        value={item}
                                        onChange={(e) => handleItemChange(index, e.target.value)}
                                        placeholder={`Item ${index + 1}`}
                                        size="md"
                                    />
                                    {newListItems.length > 1 && (
                                        <Button
                                            className="ml-2" 
                                            size="sm" 
                                            variant="plain" 
                                            color="red"
                                            onClick={() => removeItemField(index)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end mt-5 pt-3 border-t">
                        <Button
                            className="mr-2"
                            size="md"
                            variant="plain"
                            onClick={closeCreateModal}
                            disabled={creatingList}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="md"
                            variant="solid"
                            onClick={handleCreateList}
                            loading={creatingList}
                        >
                            Create List
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Batch Upload Modal */}
            <Dialog
                isOpen={isUploadModalOpen}
                onClose={closeUploadModal}
                width={800}
                closable
            >
                <div className="p-5">
                    <h5 className="mb-4 text-lg font-semibold">Batch Upload Lists</h5>
                    
                    {uploadError && (
                        <div className="text-center text-danger mb-4 p-2 bg-red-50 rounded-md">{uploadError}</div>
                    )}

                    <div className="mb-5">
                        <p className="mb-3 text-gray-600">Upload a CSV or JSON file containing your lists and items.</p>
                        <Upload
                            draggable
                            uploadLimit={1}
                            beforeUpload={beforeUpload}
                            onChange={handleFileChange}
                            showList
                            multiple={false}
                        >
                            <div className="my-16 text-center">
                                <div className="text-6xl mb-4 flex justify-center">
                                    <HiUpload className="text-gray-400" />
                                </div>
                                <p className="font-semibold">
                                    <span className="text-gray-800 dark:text-white">
                                        Drop your file here, or{' '}
                                    </span>
                                    <span className="text-blue-500">browse</span>
                                </p>
                                <p className="mt-1 opacity-60 dark:text-white">
                                    Support: CSV, JSON (max 5MB)
                                </p>
                            </div>
                        </Upload>
                    </div>

                    <div className="mb-5 bg-gray-50 p-4 rounded-lg">
                        <h6 className="mb-3 font-semibold text-gray-700">File Format Requirements:</h6>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h6 className="font-semibold mb-2">CSV Format:</h6>
                                <pre className="bg-white p-3 rounded text-xs border shadow-sm">
                                    my_list<br/>
                                    item1<br/>
                                    item2<br/>
                                    item3
                                </pre>
                                <h6 className="font-semibold mb-2">OR</h6>
                                <pre className="bg-white p-3 rounded text-xs border shadow-sm">
                                    my_list<br/>
                                    1000<br/>
                                    2000<br/>
                                    3000
                                </pre>
                            </div>
                            <div>
                                <h6 className="font-semibold mb-2">JSON Format:</h6>
                                <pre className="bg-white p-3 rounded text-xs overflow-auto border shadow-sm">
                                    {"{\n  \"list_name\": \"my_list\",\n  \"values\": [\"item1\", \"item2\", \"item3\"]\n}"}
                                </pre>
                                <h6 className="font-semibold mb-2">OR</h6>
                                <pre className="bg-white p-3 rounded text-xs overflow-auto border shadow-sm">
                                    {"{\n  \"list_name\": \"my_list\",\n  \"values\": [1000, 2000, 3000]\n}"}
                                </pre>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-5 pt-3 border-t">
                        <Button
                            className="mr-2"
                            size="md"
                            variant="plain"
                            onClick={closeUploadModal}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="md"
                            variant="solid"
                            onClick={handleUploadList}
                            loading={uploading}
                            disabled={!uploadFile}
                        >
                            Upload List
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Container>
    )
}

export default ListsPage 