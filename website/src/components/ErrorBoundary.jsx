import { Component } from 'react';
import logger from '../utils/logger';

/**
 * Error Boundary component to catch React rendering errors
 * and prevent full app crashes
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (could also send to error reporting service)
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Optional: Send to error reporting service
    // reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full flex items-center justify-center bg-[#0a0a0a] p-4">
          <div className="terminal-panel max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
              <h2 className="text-orange-500 font-bold text-lg">Something went wrong</h2>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              An error occurred while rendering this component. This has been logged for debugging.
            </p>

            {this.props.showDetails && this.state.error && (
              <div className="bg-[#080808] border border-red-500/30 rounded p-3 mb-4 overflow-auto max-h-32">
                <code className="text-red-400 text-xs font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-orange-500 text-black font-bold text-sm hover:bg-orange-600 transition-colors"
              >
                TRY AGAIN
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[#222] text-gray-300 font-bold text-sm hover:bg-[#333] transition-colors"
              >
                RELOAD APP
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary(WrappedComponent, fallback = null) {
  return function WithErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Lightweight error boundary for individual panels
 * Shows a minimal error state instead of crashing
 */
export function PanelErrorBoundary({ children, panelName = 'Panel' }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="h-full flex items-center justify-center bg-[#111] border border-red-500/20 rounded">
          <div className="text-center p-4">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-gray-500 text-xs mt-2">{panelName} error</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
