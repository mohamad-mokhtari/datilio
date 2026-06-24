import React, { useState } from 'react';
import classNames from 'classnames';
import Dialog from '@/components/ui/Dialog';
import Tooltip from '@/components/ui/Tooltip';
import { HelpCircle, X } from 'lucide-react';

export interface ContextualHelpProps {
  title: string;
  subtitle?: string;
  /** Short text on hover before the user opens the modal */
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
  width?: number;
}

const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  subtitle,
  tooltip = 'Click for help',
  children,
  className,
  iconClassName,
  width = 520,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip title={tooltip} placement="top">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={classNames(
            'inline-flex items-center justify-center rounded-full p-0.5 text-gray-400',
            'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            className
          )}
          aria-label={`Help: ${title}`}
        >
          <HelpCircle className={classNames('w-4 h-4', iconClassName)} />
        </button>
      </Tooltip>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        width={width}
        contentClassName="p-0 my-0 flex flex-col"
        closable={false}
        style={{
          content: {
            top: '12vh',
            left: '50%',
            transform: 'translate(-50%, 0)',
            margin: 0,
            position: 'fixed',
          },
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 text-white rounded-t-lg flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{title}</h2>
              {subtitle && (
                <p className="text-white/80 text-xs truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 max-h-[60vh]">{children}</div>

        <div className="flex justify-end px-5 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex-shrink-0">
          <button
            type="button"
            className="px-4 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Got it
          </button>
        </div>
      </Dialog>
    </>
  );
};

export default ContextualHelp;
