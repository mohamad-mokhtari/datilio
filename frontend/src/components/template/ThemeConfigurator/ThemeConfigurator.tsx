import ModeSwitcher from './ModeSwitcher'
import LayoutSwitcher from './LayoutSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import NavModeSwitcher from './NavModeSwitcher'
import ResetButton from './ResetButton'

export type ThemeConfiguratorProps = {
    callBackClose?: () => void
}

const ThemeConfigurator = ({ callBackClose }: ThemeConfiguratorProps) => {
    const isDevelopment = import.meta.env.VITE_ENV === 'development';
    
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="flex flex-col gap-y-10 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h6>Dark Mode</h6>
                        <span>Switch theme to dark mode</span>
                    </div>
                    <ModeSwitcher />
                </div>
                <div>
                    <h6 className="mb-3">Nav Mode</h6>
                    <NavModeSwitcher />
                </div>
                <div>
                    <h6 className="mb-3">Theme</h6>
                    <ThemeSwitcher />
                </div>
                {isDevelopment && (
                    <div>
                        <h6 className="mb-3">Layout</h6>
                        <LayoutSwitcher />
                    </div>
                )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <ResetButton />
            </div>
        </div>
    )
}

export default ThemeConfigurator
