/**
 * Simple Time Picker Component
 * Lightweight alternative to rsuite TimePicker with friendly UX
 */

import { useState, useEffect, useRef } from 'react';
import { HiOutlineClock } from 'react-icons/hi';

interface SimpleTimePickerProps {
  value?: string; // Format: "HH:MM:SS"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const SimpleTimePicker: React.FC<SimpleTimePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select time...',
  className = '',
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);
  const secondScrollRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        setHours(parts[0] || '00');
        setMinutes(parts[1] || '00');
        setSeconds(parts[2] || '00');
      }
    }
  }, [value]);

  // Auto-scroll to selected values when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        // Scroll hour column to selected hour
        if (hourScrollRef.current) {
          const selectedHour = hourScrollRef.current.querySelector('.bg-blue-500');
          if (selectedHour) {
            selectedHour.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        // Scroll minute column to selected minute
        if (minuteScrollRef.current) {
          const selectedMinute = minuteScrollRef.current.querySelector('.bg-blue-500');
          if (selectedMinute) {
            selectedMinute.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        // Scroll second column to selected second
        if (secondScrollRef.current) {
          const selectedSecond = secondScrollRef.current.querySelector('.bg-blue-500');
          if (selectedSecond) {
            selectedSecond.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [isOpen, hours, minutes, seconds]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update internal state only (don't notify parent yet)
  const handleHourChange = (h: string) => {
    setHours(h);
  };

  const handleMinuteChange = (m: string) => {
    setMinutes(m);
  };

  const handleSecondChange = (s: string) => {
    setSeconds(s);
  };

  // Apply time and close picker (called by Done button)
  const applyTime = () => {
    const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    onChange(formattedTime);
    setIsOpen(false);
  };

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Generate minute/second options (0-59)
  const minuteSecondOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const displayValue = value || placeholder;
  const inputSizeClass = size === 'sm' ? 'py-2' : 'py-3';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 ${inputSizeClass} border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all`}
      >
        <div className="flex items-center space-x-2">
          <HiOutlineClock className="text-gray-400" />
          <span className={`text-sm ${value ? 'text-gray-900 font-mono' : 'text-gray-400'}`}>
            {displayValue}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl w-full min-w-[280px]">
          <div className="p-4">
            {/* Header */}
            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
              <span>Select Time</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Time Selection Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Hours */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 text-center">
                  Hour
                </label>
                <div ref={hourScrollRef} className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 scroll-smooth">
                  {hourOptions.map((h) => (
                    <div
                      key={h}
                      onClick={() => handleHourChange(h)}
                      className={`px-3 py-2 text-sm text-center cursor-pointer transition-colors ${
                        h === hours
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 text-center">
                  Minute
                </label>
                <div ref={minuteScrollRef} className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 scroll-smooth">
                  {minuteSecondOptions.map((m) => (
                    <div
                      key={m}
                      onClick={() => handleMinuteChange(m)}
                      className={`px-3 py-2 text-sm text-center cursor-pointer transition-colors ${
                        m === minutes
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Seconds */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 text-center">
                  Second
                </label>
                <div ref={secondScrollRef} className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 scroll-smooth">
                  {minuteSecondOptions.map((s) => (
                    <div
                      key={s}
                      onClick={() => handleSecondChange(s)}
                      className={`px-3 py-2 text-sm text-center cursor-pointer transition-colors ${
                        s === seconds
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Selection Display */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Selected Time</div>
                <div className="text-lg font-mono font-semibold text-gray-900">
                  {hours}:{minutes}:{seconds}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const h = now.getHours().toString().padStart(2, '0');
                  const m = now.getMinutes().toString().padStart(2, '0');
                  const s = now.getSeconds().toString().padStart(2, '0');
                  setHours(h);
                  setMinutes(m);
                  setSeconds(s);
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => {
                  setHours('00');
                  setMinutes('00');
                  setSeconds('00');
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors font-medium"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyTime}
                className="flex-1 px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-semibold shadow-sm"
              >
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTimePicker;

