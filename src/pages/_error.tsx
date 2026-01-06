import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error | null;
}

function Error({ statusCode, err }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {statusCode || 'Erreur'}
        </h1>
        <p className="text-gray-600 mb-4">
          {statusCode === 404
            ? 'Page non trouvée'
            : statusCode === 500
              ? 'Erreur serveur'
              : err?.message || 'Une erreur est survenue'}
        </p>
        <div className="space-x-4">
          <button
            onClick={() => (window.location.href = '/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Recharger
          </button>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res
    ? res.statusCode
    : err
      ? (err as any).statusCode || 500
      : 404;
  return { statusCode, err: err || null };
};

export default Error;
