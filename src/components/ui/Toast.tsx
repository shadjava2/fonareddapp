import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-green-500';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-rose-50 border-l-red-500';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-yellow-500';
      case 'info':
        return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-blue-500';
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-l-gray-500';
    }
  };

  const getTitleColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  };

  const getMessageColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getShimmerStyle = () => {
    if (!isVisible || isLeaving) return {};

    switch (toast.type) {
      case 'error':
        return {
          background: `linear-gradient(90deg,
            ${toast.type === 'error' ? '#fef2f2' : '#fff'} 0%,
            ${toast.type === 'error' ? '#fee2e2' : '#f9fafb'} 50%,
            ${toast.type === 'error' ? '#fef2f2' : '#fff'} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s ease-in-out infinite',
        };
      case 'warning':
        return {
          background: `linear-gradient(90deg,
            #fffbeb 0%,
            #fef3c7 50%,
            #fffbeb 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s ease-in-out infinite',
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-700 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100 rotate-0' : 'translate-x-full opacity-0 scale-95 rotate-3'}
        ${getBackgroundColor()}
        border-l-4 border-r border-t border-b rounded-xl shadow-2xl p-5 mb-4 max-w-md w-full
        backdrop-blur-sm relative overflow-hidden
        ${isVisible && !isLeaving ? 'animate-[slideIn_0.7s_ease-out]' : ''}
      `}
      style={{
        boxShadow:
          '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        ...getShimmerStyle(),
      }}
    >
      {/* Effet de brillance animé en arrière-plan */}
      {isVisible && !isLeaving && toast.type === 'error' && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        />
      )}
      <div className="flex items-start relative z-10">
        <div className="flex-shrink-0">
          <div
            className={`p-1 rounded-full bg-white/80 backdrop-blur-sm ${
              isVisible && !isLeaving && toast.type === 'error'
                ? 'animate-[pulse_2s_ease-in-out_infinite,bounce_1s_ease-in-out]'
                : isVisible && !isLeaving
                  ? 'animate-[pulse_2s_ease-in-out_infinite]'
                  : ''
            }`}
          >
            {getIcon()}
          </div>
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <h4
            className={`text-base font-semibold leading-6 ${getTitleColor()}`}
          >
            {toast.title}
          </h4>
          {toast.message && (
            <p className={`mt-2 text-sm leading-5 ${getMessageColor()}`}>
              {toast.message}
            </p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleRemove}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barre de progression */}
      {toast.duration && toast.duration > 0 && (
        <div className="mt-3 w-full bg-white/30 rounded-full h-1">
          <div
            className="h-1 bg-current rounded-full transition-all duration-100 ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @keyframes slideIn {
          0% {
            transform: translateX(100%) scale(0.8) rotate(5deg);
            opacity: 0;
          }
          60% {
            transform: translateX(-5%) scale(1.02) rotate(-1deg);
          }
          100% {
            transform: translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default ToastComponent;
