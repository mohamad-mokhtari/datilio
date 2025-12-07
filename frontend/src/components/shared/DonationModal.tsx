import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { HiX } from 'react-icons/hi';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const donationLink = import.meta.env.VITE_DONATION_LINK || 'https://buymeacoffee.com/datilio';

  const handleDonate = () => {
    window.open(donationLink, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={540}
      closable={false}
    >
      <div className="relative overflow-hidden rounded-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-white hover:text-gray-200 transition-colors z-10"
          aria-label="Close"
        >
          <HiX className="w-6 h-6" />
        </button>

        {/* Header with Purple Gradient */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center py-8 px-6">
          <div className="text-6xl mb-4 animate-pulse" style={{ textShadow: '0 2px 10px rgba(255, 221, 0, 0.3)' }}>
            ☕
          </div>
          <h2 className="text-3xl font-bold">
            Support Datilio 🚀
          </h2>
        </div>

        {/* Body */}
        <div className="bg-white dark:bg-gray-800 px-8 py-10">
          {/* Message */}
          <div className="space-y-4 mb-8">
            <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed text-base">
              Every contribution helps us keep improving this platform and building new features for you.
            </p>
            
            <p className="text-gray-900 dark:text-white text-center font-semibold text-base mb-4">
              As a supporter, you'll get:
            </p>

            {/* Benefits List */}
            <ul className="text-left inline-block space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-lg">✨</span>
                <span>Early access to new tools and features</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-lg">💎</span>
                <span>Special discounts on premium plans</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-lg">🏆</span>
                <span>Recognition in our contributor list</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <span className="text-lg">💌</span>
                <span>Priority support</span>
              </li>
            </ul>

            <p className="text-blue-600 dark:text-blue-400 text-center font-bold text-base mt-6">
              Your help keeps this project alive — thank you for being part of the journey! 💛
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleDonate}
              className="px-10 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              ☕ Buy Me a Coffee
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-transparent border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-base rounded-full transition-all duration-300"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default DonationModal;

