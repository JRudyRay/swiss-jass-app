import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'default', duration = 3000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className={`jass-toast jass-toast--${type}`} role="status">
      {message}
    </div>
  );
};

export default Toast;
