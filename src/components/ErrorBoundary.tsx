import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorCount = 0;
  private maxErrors = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Limiter les logs pour éviter les boucles
    if (this.errorCount < this.maxErrors) {
      console.error('❌ ErrorBoundary capturé:', error);
      console.error('❌ ErrorInfo:', errorInfo);
      this.errorCount++;
    }

    // Empêcher les boucles infinies
    if (this.errorCount >= this.maxErrors) {
      console.error("❌ Trop d'erreurs, arrêt du logging");
    }
  }

  handleReset = () => {
    this.errorCount = 0;
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Une erreur est survenue
            </h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Erreur inconnue'}
            </p>
            <div className="space-x-4">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Réessayer
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Retour à l'accueil
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
