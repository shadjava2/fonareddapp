import { useRouter } from 'next/router';
import { useEffect } from 'react';

const LoginPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page d'accueil (qui est maintenant le login)
    router.replace('/');
  }, [router]);

  // Afficher un loader pendant la redirection
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Redirection vers la page de connexion...
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
