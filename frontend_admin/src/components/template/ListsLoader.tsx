import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { fetchAllEnums } from '@/store/slices/enum/enumSlice'
import { RootState } from '@/store/rootReducer'

const ListsLoader = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useAppDispatch()
    const enumData = useAppSelector((state: RootState) => state.enum.enums.enumData)
    const { signedIn } = useAppSelector((state: RootState) => state.auth.session)

    useEffect(() => {
        // Only fetch enum data if user is signed in and data is not already loaded
        if (signedIn && !enumData) {
            dispatch(fetchAllEnums())
        }
    }, [dispatch, signedIn, enumData])

    return <>{children}</>
}

export default ListsLoader 