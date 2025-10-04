import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md',
  color = 'var(--color-swiss-green, #1A7A4C)'
}) => {
  const sizeMap = {
    sm: '16px',
    md: '32px',
    lg: '48px'
  };

  const spinnerSize = sizeMap[size];

  return (
    <div
      className="spinner"
      style={{
        width: spinnerSize,
        height: spinnerSize,
        border: `3px solid rgba(0, 0, 0, 0.1)`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
};

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...',
  fullScreen = false 
}) => {
  const containerStyle: React.CSSProperties = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(245, 242, 232, 0.95)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    minHeight: '200px',
  };

  return (
    <div style={containerStyle}>
      <Spinner size="lg" />
      <p style={{
        marginTop: '1rem',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#374151',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        {message}
      </p>
    </div>
  );
};

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  style = {}
}) => {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style
      }}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }}>
      <Skeleton height="24px" width="60%" style={{ marginBottom: '1rem' }} />
      <Skeleton height="16px" width="80%" style={{ marginBottom: '0.5rem' }} />
      <Skeleton height="16px" width="70%" style={{ marginBottom: '1rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
        <Skeleton height="36px" width="80px" borderRadius="8px" />
        <Skeleton height="36px" width="80px" borderRadius="8px" />
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🎴',
  title,
  description,
  action,
  style = {}
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      ...style
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1rem',
        opacity: 0.5,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          marginBottom: '2rem',
          maxWidth: '400px',
          margin: '0.5rem auto 2rem',
        }}>
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: '2rem' }}>
          {action}
        </div>
      )}
    </div>
  );
};

// Add CSS animations to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Loading;
