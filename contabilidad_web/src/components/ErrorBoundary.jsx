import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-5xl mx-auto">
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h1 className="text-2xl font-bold">Error Crítico del Sistema</h1>
            </div>
            <p className="mb-4">Ocurrió un error inesperado al renderizar este componente:</p>
            <pre className="bg-white p-4 rounded-lg overflow-x-auto text-sm border border-red-100 mb-4 whitespace-pre-wrap">
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
