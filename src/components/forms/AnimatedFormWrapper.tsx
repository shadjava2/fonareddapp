import { Dialog } from '@/components/ui/Dialog';
import React from 'react';

interface AnimatedFormWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const AnimatedFormWrapper: React.FC<AnimatedFormWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop avec animation */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${
            isOpen ? 'opacity-50' : 'opacity-0'
          }`}
          onClick={onClose}
        />

        {/* Modal avec animation */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={`relative w-full ${sizeClasses[size]} transform transition-all duration-300 ${
              isOpen
                ? 'translate-y-0 opacity-100 scale-100'
                : 'translate-y-4 opacity-0 scale-95'
            }`}
          >
            <div className="relative bg-white rounded-lg shadow-xl overflow-hidden">
              {/* Header avec gradient */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                  <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-white/10"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content avec animation d'entrée */}
              <div
                className={`px-6 py-6 transition-all duration-500 ${
                  isOpen ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AnimatedFormWrapper;
