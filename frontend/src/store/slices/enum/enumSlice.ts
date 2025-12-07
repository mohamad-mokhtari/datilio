import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_ENUM_NAME } from './constants'
import ApiService2 from '@/services/ApiService2'

// Define interfaces for the enum data structure
interface MimesisEnum {
    [key: string]: {
        [key: string]: string | string[] | [string, number];
    };
}

interface Field {
    return_type: string;
    params: Array<{[key: string]: string;}>;
    static?: boolean;
    category_type?: string;
    multi_type?: string;
}

interface FieldDefinition {
    [key: string]: Field;
}

interface AllFields {
    [category: string]: FieldDefinition[];
}

export interface EnumResponse {
    enums: {
        mimesis: MimesisEnum;
    };
    categories: {
        synthethic_categories: string[];
    };
    all_fields: {
        fields: AllFields;
    };
}

export interface EnumState {
    enumData: EnumResponse | null;
    loading: boolean;
    error: string | null;
}

export const initialState: EnumState = {
    enumData: null,
    loading: false,
    error: null,
}

export const fetchAllEnums = createAsyncThunk(
    'enum/fetchAllEnums',
    async (_, { rejectWithValue }) => {
        try {
            const response = await ApiService2.get('/enums/all');
            return response.data as EnumResponse;
        } catch (error) {
            return rejectWithValue('Failed to fetch enums data');
        }
    }
);

export const enumSlice = createSlice({
    name: SLICE_ENUM_NAME,
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllEnums.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllEnums.fulfilled, (state, action) => {
                state.loading = false;
                state.enumData = action.payload;
            })
            .addCase(fetchAllEnums.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
})

export default enumSlice.reducer
