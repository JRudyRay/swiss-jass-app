import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error Boundary Caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Optionally reload the page
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h1 style={styles.title}>Oops! Something went wrong</h1>
            <p style={styles.message}>
              We're sorry for the inconvenience. The game encountered an unexpected error.
            </p>
            
            {this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Technical Details</summary>
                <pre style={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button 
                onClick={this.handleReset}
                style={styles.button}
              >
                🔄 Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                style={{ ...styles.button, ...styles.buttonSecondary }}
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f2e8 0%, #e8e5d8 100%)',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '3rem',
    maxWidth: '600px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    textAlign: 'center',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    animation: 'pulse 2s ease-in-out infinite',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#1a1a1a',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1.1rem',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  details: {
    textAlign: 'left',
    marginBottom: '2rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.5rem',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#dc2626',
    overflow: 'auto',
    maxHeight: '200px',
    padding: '1rem',
    background: '#fee2e2',
    borderRadius: '6px',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    background: '#1A7A4C',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(26, 122, 76, 0.3)',
  },
  buttonSecondary: {
    background: '#6b7280',
    boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)',
  }
};

export default ErrorBoundary;
