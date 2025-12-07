import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { themeConfig } from '@/configs/theme.config'
import {
    LAYOUT_TYPE_MODERN,
    LAYOUT_TYPE_CLASSIC,
    LAYOUT_TYPE_STACKED_SIDE,
    NAV_MODE_TRANSPARENT,
    NAV_MODE_LIGHT,
    NAV_MODE_DARK,
    NAV_MODE_THEMED,
    MODE_DARK,
    MODE_LIGHT,
    LAYOUT_TYPE_DECKED,
} from '@/constants/theme.constant'
import type {
    LayoutType,
    Mode,
    NavMode,
    ColorLevel,
    Direction,
} from '@/@types/theme'

const initialNavMode = () => {
    if (
        themeConfig.layout.type === LAYOUT_TYPE_MODERN &&
        themeConfig.navMode !== NAV_MODE_THEMED
    ) {
        return NAV_MODE_TRANSPARENT
    }

    return themeConfig.navMode
}

export type ThemeState = {
    themeColor: string
    direction: Direction
    mode: Mode
    primaryColorLevel: ColorLevel
    panelExpand: boolean
    navMode: NavMode
    cardBordered: boolean
    layout: {
        type: LayoutType
        sideNavCollapse: boolean
        previousType?: LayoutType
    }
}

// Function to get initial state with localStorage values if available
const getInitialState = (): ThemeState => {
    try {
        const savedCustomization = localStorage.getItem('theme-customization')
        if (savedCustomization) {
            const customization = JSON.parse(savedCustomization)
            return {
                themeColor: customization.themeColor || themeConfig.themeColor,
                direction: customization.direction || themeConfig.direction,
                mode: customization.mode || themeConfig.mode,
                primaryColorLevel: customization.primaryColorLevel || themeConfig.primaryColorLevel,
                panelExpand: themeConfig.panelExpand,
                cardBordered: themeConfig.cardBordered,
                navMode: customization.navMode || initialNavMode(),
                layout: {
                    ...themeConfig.layout,
                    type: customization.layoutType || themeConfig.layout.type,
                },
            }
        }
    } catch (error) {
        console.warn('Failed to load theme customization from localStorage:', error)
    }
    
    // Fallback to default theme config
    return {
        themeColor: themeConfig.themeColor,
        direction: themeConfig.direction,
        mode: themeConfig.mode,
        primaryColorLevel: themeConfig.primaryColorLevel,
        panelExpand: themeConfig.panelExpand,
        cardBordered: themeConfig.cardBordered,
        navMode: initialNavMode(),
        layout: themeConfig.layout,
    }
}

const initialState: ThemeState = getInitialState()

const availableNavColorLayouts = [
    LAYOUT_TYPE_CLASSIC,
    LAYOUT_TYPE_STACKED_SIDE,
    LAYOUT_TYPE_DECKED,
]

export const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setDirection: (state, action: PayloadAction<Direction>) => {
            state.direction = action.payload
        },
        setMode: (state, action: PayloadAction<Mode>) => {
            const availableColorNav = availableNavColorLayouts.includes(
                state.layout.type
            )

            if (
                availableColorNav &&
                action.payload === MODE_DARK &&
                state.navMode !== NAV_MODE_THEMED
            ) {
                state.navMode = NAV_MODE_DARK
            }
            if (
                availableColorNav &&
                action.payload === MODE_LIGHT &&
                state.navMode !== NAV_MODE_THEMED
            ) {
                state.navMode = NAV_MODE_LIGHT
            }
            state.mode = action.payload
        },
        setLayout: (state, action: PayloadAction<LayoutType>) => {
            state.cardBordered = action.payload === LAYOUT_TYPE_MODERN
            if (action.payload === LAYOUT_TYPE_MODERN) {
                state.navMode = NAV_MODE_TRANSPARENT
            }

            const availableColorNav = availableNavColorLayouts.includes(
                action.payload
            )

            if (availableColorNav && state.mode === MODE_LIGHT) {
                state.navMode = NAV_MODE_LIGHT
            }

            if (availableColorNav && state.mode === MODE_DARK) {
                state.navMode = NAV_MODE_DARK
            }

            state.layout = {
                ...state.layout,
                ...{ type: action.payload },
            }
        },
        setPreviousLayout: (state, action) => {
            state.layout.previousType = action.payload
        },
        setSideNavCollapse: (state, action) => {
            state.layout = {
                ...state.layout,
                ...{ sideNavCollapse: action.payload },
            }
        },
        setNavMode: (state, action: PayloadAction<NavMode | 'default'>) => {
            if (action.payload !== 'default') {
                state.navMode = action.payload
            } else {
                if (state.layout.type === LAYOUT_TYPE_MODERN) {
                    state.navMode = NAV_MODE_TRANSPARENT
                }

                const availableColorNav = availableNavColorLayouts.includes(
                    state.layout.type
                )

                if (availableColorNav && state.mode === MODE_LIGHT) {
                    state.navMode = NAV_MODE_LIGHT
                }

                if (availableColorNav && state.mode === MODE_DARK) {
                    state.navMode = NAV_MODE_DARK
                }
            }
        },
        setPanelExpand: (state, action: PayloadAction<boolean>) => {
            state.panelExpand = action.payload
        },
        setThemeColor: (state, action: PayloadAction<string>) => {
            state.themeColor = action.payload
        },
        setThemeColorLevel: (state, action) => {
            state.primaryColorLevel = action.payload
        },
        resetToDefault: (state) => {
            // Reset all theme settings to default values from themeConfig
            state.themeColor = themeConfig.themeColor
            state.direction = themeConfig.direction
            state.mode = themeConfig.mode
            state.primaryColorLevel = themeConfig.primaryColorLevel
            state.navMode = initialNavMode()
            state.layout = {
                ...themeConfig.layout,
                type: themeConfig.layout.type,
            }
        },
    },
})

export const {
    setDirection,
    setMode,
    setLayout,
    setSideNavCollapse,
    setNavMode,
    setPanelExpand,
    setThemeColor,
    setThemeColorLevel,
    setPreviousLayout,
    resetToDefault,
} = themeSlice.actions

export default themeSlice.reducer
