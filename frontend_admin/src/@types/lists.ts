import { UserList } from '@/store/slices/lists/listsSlice'

export interface ListItem {
    id: string
    list_id: string
    value: string
}

export type ListItemsResponse = ListItem[] 