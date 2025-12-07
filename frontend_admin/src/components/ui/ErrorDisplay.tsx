import React from 'react';
import { useError } from '@/contexts/ErrorContext';
import { HiOutlineExclamation, HiOutlineInformationCircle } from 'react-icons/hi';

const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md space-y-3">
      {errors.map(error => (
        <div
          key={error.id}
          className={`rounded-lg shadow-lg cursor-pointer transition-all duration-300 animate-in slide-in-from-right-full ${
            error.isCritical 
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' 
              : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
          } hover:translate-x-[-5px]`}
          onClick={() => removeError(error.id)}
        >
          <div className="flex items-start p-4 gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {error.isCritical ? (
                <HiOutlineExclamation className="w-5 h-5" />
              ) : (
                <HiOutlineInformationCircle className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm mb-1">
                {error.isCritical ? 'Error' : 'Notice'}
              </div>
              
              <div className="text-sm leading-relaxed">
                {error.message}
              </div>
              
              {error.validationErrors && error.validationErrors.length > 0 && (
                <ul className="mt-2 ml-4 text-xs space-y-1 opacity-90">
                  {error.validationErrors.map((validationError, index) => (
                    <li key={index} className="list-disc">
                      {validationError}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeError(error.id);
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ErrorDisplay;
