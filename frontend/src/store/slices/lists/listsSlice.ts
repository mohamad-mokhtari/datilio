import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_USER_LISTS_NAME } from './constants'
import ApiService2 from '@/services/ApiService2'
import axios from 'axios'

export interface UserList {
    id: string
    user_id: string
    name: string
}

export type FileType = 'csv' | 'json' | 'excel';

export interface DataFile {
    file_id: string
    user_id: string
    file_name: string
    file_type: FileType
    file_path: string
    file_path_exists: boolean
    file_size: number
    updated_at: string
    source?: 'uploaded' | 'synthetic'
}

export interface ListsState {
    userLists: UserList[]
    userFiles: DataFile[]
    loading: boolean
    error: string | null
}

const initialState: ListsState = {
    userLists: [],
    userFiles: [],
    loading: false,
    error: null
}

export const fetchUserLists = createAsyncThunk(
    'lists/fetchUserLists',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService2.get<UserList[]>('/lists/users/lists/');
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
)

export const fetchUserFiles = createAsyncThunk(
    'lists/fetchUserFiles',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService2.get<DataFile[]>('/data/users/files');
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
)

export const fetchUploadedFiles = createAsyncThunk(
    'lists/fetchUploadedFiles',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService2.get<DataFile[]>('/data/users/files/by-source/uploaded');
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
)

export const fetchSyntheticFiles = createAsyncThunk(
    'lists/fetchSyntheticFiles',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService2.get<DataFile[]>('/data/users/files/by-source/synthetic');
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('An unknown error occurred');
        }
    }
)

export const fetchAllLists = createAsyncThunk(
    'lists/fetchAllLists',
    async (_, { dispatch }) => {
        await Promise.all([
            dispatch(fetchUserLists()),
            dispatch(fetchUserFiles())
        ]);
    }
)

const listsSlice = createSlice({
    name: SLICE_USER_LISTS_NAME,
    initialState,
    reducers: {
        resetLists: (state) => {
            state.userLists = [];
            state.userFiles = [];
            state.loading = false;
            state.error = null;
        },
        clearLists: (state) => {
            state.userFiles = [];
            state.loading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserLists.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserLists.fulfilled, (state, action) => {
                state.loading = false;
                state.userLists = action.payload;
            })
            .addCase(fetchUserLists.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchUserFiles.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserFiles.fulfilled, (state, action) => {
                state.loading = false;
                state.userFiles = action.payload;
            })
            .addCase(fetchUserFiles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchAllLists.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllLists.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(fetchAllLists.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export const { resetLists, clearLists } = listsSlice.actions;
export default listsSlice.reducer; 