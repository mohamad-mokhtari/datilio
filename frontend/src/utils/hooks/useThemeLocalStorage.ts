import { useEffect, useState } from 'react'
import { useAppSelector, useAppDispatch } from '@/store'
import {
    setMode,
    setThemeColor,
    setThemeColorLevel,
    setNavMode,
    setDirection,
    setLayout,
    resetToDefault,
} from '@/store/slices/theme/themeSlice'
import type { Mode, Direction, NavMode, ColorLevel, LayoutType } from '@/@types/theme'

const THEME_STORAGE_KEY = 'theme-customization'

export type ThemeCustomization = {
    mode: Mode
    themeColor: string
    primaryColorLevel: ColorLevel
    navMode: NavMode
    direction: Direction
    layoutType: LayoutType
}

const useThemeLocalStorage = () => {
    const dispatch = useAppDispatch()
    const theme = useAppSelector((state) => state.theme)
    const [isInitialized, setIsInitialized] = useState(false)

    // Save theme settings to localStorage whenever they change (but not on initial load)
    useEffect(() => {
        // Skip saving on initial mount to prevent overwriting localStorage with default values
        if (!isInitialized) {
            setIsInitialized(true)
            return
        }

        const customization: ThemeCustomization = {
            mode: theme.mode,
            themeColor: theme.themeColor,
            primaryColorLevel: theme.primaryColorLevel,
            navMode: theme.navMode,
            direction: theme.direction,
            layoutType: theme.layout.type,
        }

        try {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(customization))
        } catch (error) {
            console.warn('Failed to save theme customization to localStorage:', error)
        }
    }, [theme.mode, theme.themeColor, theme.primaryColorLevel, theme.navMode, theme.direction, theme.layout.type, isInitialized])

    return {
        saveCustomization: (customization: ThemeCustomization) => {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(customization))
            } catch (error) {
                console.warn('Failed to save theme customization to localStorage:', error)
            }
        },
        loadCustomization: (): ThemeCustomization | null => {
            try {
                const savedCustomization = localStorage.getItem(THEME_STORAGE_KEY)
                return savedCustomization ? JSON.parse(savedCustomization) : null
            } catch (error) {
                console.warn('Failed to load theme customization from localStorage:', error)
                return null
            }
        },
        clearCustomization: () => {
            try {
                localStorage.removeItem(THEME_STORAGE_KEY)
            } catch (error) {
                console.warn('Failed to clear theme customization from localStorage:', error)
            }
        },
        resetToDefault: () => {
            dispatch(resetToDefault())
            try {
                localStorage.removeItem(THEME_STORAGE_KEY)
            } catch (error) {
                console.warn('Failed to clear theme customization from localStorage:', error)
            }
        }
    }
}

export default useThemeLocalStorage
