import React from 'react';
import Progress from '@/components/ui/Progress';
import Badge from '@/components/ui/Badge';
import { formatBytes, formatNumber } from '@/utils/format';

interface UsageProgressBarProps {
    label: string;
    used: number;
    limit: number;
    unit?: string;
    showPercentage?: boolean;
    className?: string;
}

const UsageProgressBar: React.FC<UsageProgressBarProps> = ({
    label,
    used,
    limit,
    unit = '',
    showPercentage = true,
    className = ''
}) => {
    const percentage = Math.min((used / limit) * 100, 100);
    
    // Color coding based on usage percentage
    const getColor = (percent: number) => {
        if (percent >= 95) return 'red';
        if (percent >= 80) return 'yellow';
        return 'green';
    };

    const getStatusColor = (percent: number) => {
        if (percent >= 95) return 'danger';
        if (percent >= 80) return 'warning';
        return 'success';
    };

    const formatValue = (value: number) => {
        if (unit === 'GB' || unit === 'MB') {
            return formatBytes(value * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024));
        }
        return formatNumber(value);
    };

    return (
        <div className={`usage-progress-bar ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatValue(used)} / {formatValue(limit)}
                    </span>
                    {showPercentage && (
                        <Badge variant="solid" color={getStatusColor(percentage)}>
                            {percentage.toFixed(1)}%
                        </Badge>
                    )}
                </div>
            </div>
            <Progress 
                percent={percentage} 
                color={getColor(percentage)}
                showInfo={false}
                className="mb-1"
            />
        </div>
    );
};

export default UsageProgressBar;
