import React, { useState } from 'react';
import DonationModal from './DonationModal';

const FloatingDonationButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 group"
        aria-label="Support Datilio"
        title="Support Datilio"
      >
        <div className="relative">
          {/* Button with Yellow/Orange Gradient */}
          <div className="relative flex items-center justify-center w-[60px] h-[60px] bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 border-4 border-white dark:border-gray-800">
            <span className="text-4xl text-white animate-pulse">☕</span>
          </div>
          
          {/* Tooltip on Hover */}
          <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-lg">
            Support Datilio 💛
            <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </button>

      <DonationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FloatingDonationButton;

