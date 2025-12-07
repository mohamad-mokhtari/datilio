import classNames from 'classnames'
import { SIZES } from '../utils/constants'
import type { CommonProps } from '../@types/common'

interface LineProps extends CommonProps {
    percent: number
    strokeColor?: string
    size?: 'sm' | 'md'
}

const Line = (props: LineProps) => {
    const { percent, size, children, strokeColor } = props

    // Map color names to actual Tailwind colors
    const colorMap: Record<string, string> = {
        'red': '#ef4444',
        'green': '#22c55e',
        'blue': '#3b82f6',
        'yellow': '#eab308',
        'purple': '#a855f7',
        'indigo': '#6366f1',
        'pink': '#ec4899',
        'orange': '#f97316',
    }

    const getBackgroundColor = () => {
        // If strokeColor is a simple color name, use the color map
        if (strokeColor && colorMap[strokeColor]) {
            return colorMap[strokeColor]
        }
        // If it's a Tailwind color like 'indigo-600', extract and use it
        if (strokeColor?.includes('-')) {
            const [colorName] = strokeColor.split('-')
            return colorMap[colorName] || '#3b82f6' // default to blue
        }
        // Default color
        return '#3b82f6'
    }

    const progressBackgroundClass = classNames(
        'progress-bg',
        size === SIZES.SM ? 'h-1.5' : 'h-2'
    )

    return (
        <>
            <div className="progress-wrapper">
                <div className="progress-inner">
                    <div
                        className={progressBackgroundClass}
                        style={{ 
                            width: `${percent}%`,
                            backgroundColor: getBackgroundColor()
                        }}
                    />
                </div>
            </div>
            {children}
        </>
    )
}

Line.displayName = 'ProgressLine'

export default Line
