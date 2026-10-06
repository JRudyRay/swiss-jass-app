import React from 'react';
import Icon from './Icon';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const SPINNER_PX = { sm: 16, md: 28, lg: 44 };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color }) => {
  const px = SPINNER_PX[size];
  return (
    <span
      className="spinner"
      role="status"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        width: px,
        height: px,
        ...(color ? { borderTopColor: color } : null),
      }}
    />
  );
};

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  rows?: number;
}

// Skeleton rows with the message underneath; flat paper background, no blur.
export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  fullScreen = false,
  rows = 3,
}) => (
  <div className={`loading${fullScreen ? ' loading--full' : ''}`} role="status" aria-live="polite">
    <div className="loading__rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
    <p className="loading__msg">{message}</p>
  </div>
);

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  style = {},
}) => (
  <div
    className="skeleton"
    aria-hidden="true"
    style={{ width, height, minHeight: 0, borderRadius, ...style }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="card" aria-hidden="true">
    <Skeleton height="22px" width="60%" style={{ marginBottom: 12 }} />
    <Skeleton height="14px" width="80%" style={{ marginBottom: 8 }} />
    <Skeleton height="14px" width="70%" style={{ marginBottom: 16 }} />
    <Skeleton height="44px" width="120px" />
  </div>
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  style,
}) => (
  <div className="empty" style={style}>
    <div className="empty__icon">{icon ?? <Icon name="table" size={44} />}</div>
    <h3 className="empty__title">{title}</h3>
    {description && <p className="empty__text">{description}</p>}
    {action && <div className="empty__action">{action}</div>}
  </div>
);

export default Loading;
