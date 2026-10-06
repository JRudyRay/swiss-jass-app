import React, { Component, ReactNode, ErrorInfo } from 'react';
import Icon from './Icon';

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
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
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
        <div className="errorpage">
          <div className="errorpage__card card">
            <div className="errorpage__icon">
              <Icon name="warning" size={44} />
            </div>
            <h1 className="errorpage__title">Oops! Something went wrong</h1>
            <p className="errorpage__msg">
              We're sorry for the inconvenience. The game encountered an unexpected error.
            </p>

            {this.state.error && (
              <details className="errorpage__details">
                <summary>Technical Details</summary>
                <pre>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="errorpage__actions">
              <button className="btn btn--primary" onClick={this.handleReset}>
                <Icon name="refresh" size={18} />
                Try Again
              </button>
              <button className="btn" onClick={() => (window.location.href = '/')}>
                <Icon name="home" size={18} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
