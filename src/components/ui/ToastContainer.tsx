import React from 'react';
import ToastComponent, { Toast } from './Toast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  return (
    <div className="fixed top-6 right-6 z-[9999] space-y-3 pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="transform transition-all duration-300 ease-out"
            style={{
              transform: `translateY(${index * 8}px)`,
              zIndex: 9999 - index,
            }}
          >
            <ToastComponent toast={toast} onRemove={onRemove} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
