import classNames from 'classnames'
import { getBackendBaseUrl } from '@/utils/apiClient'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number | string
}

const LOGO_SRC_PATH = '/img/logo/'

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    const handleLogoClick = () => {
        window.location.href = getBackendBaseUrl()
    }

    return (
        <div
            className={classNames('logo flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity duration-200', className)}
            style={{
                ...style,
                ...{ width: logoWidth },
            }}
            onClick={handleLogoClick}
        >
            <img
                className={imgClass}
                src={`${LOGO_SRC_PATH}logo-${mode}-${type}.png`}
                alt={`${APP_NAME} logo`}
                style={{ height: '50px', width: 'auto' }}
            />
            <div className="flex flex-col">
                <h1 className={`text-xl font-bold font-serif tracking-wide ${
                    mode === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                    Datilio
                </h1>
            </div>
        </div>
    )
}

export default Logo
