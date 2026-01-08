import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-danger-600 dark:text-danger-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>

            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-secondary-500 dark:text-secondary-400 mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-secondary-100 dark:bg-secondary-700 p-3 rounded text-xs font-mono text-secondary-700 dark:text-secondary-300 overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
