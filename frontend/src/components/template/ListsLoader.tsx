import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { fetchAllLists } from '@/store/slices/lists/listsSlice'
import { fetchAllEnums } from '@/store/slices/enum/enumSlice'
import { useSelector } from 'react-redux'
import { RootState } from '@/store/rootReducer'

const ListsLoader = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useAppDispatch()
    const { userLists, loading } = useAppSelector((state: RootState) => state.lists.lists)
    const enumData = useAppSelector((state: RootState) => state.enum.enums.enumData)
    const { signedIn } = useAppSelector((state: RootState) => state.auth.session)

    useEffect(() => {
        // Only fetch data if user is signed in and data is not already loaded
        if (signedIn) {
            if (!userLists) {
                dispatch(fetchAllLists())
            }
            
            if (!enumData) {
                dispatch(fetchAllEnums())
            }
        }
    }, [dispatch, signedIn, userLists, enumData])

    return <>{children}</>
}

export default ListsLoader 