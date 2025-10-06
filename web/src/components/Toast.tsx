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

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '💬';
    }
  };

  return (
    <div className={`toast ${type}`}>
      <span style={{ marginRight: '0.5rem', fontSize: '18px' }}>{getIcon()}</span>
      {message}
    </div>
  );
};

export default Toast;
