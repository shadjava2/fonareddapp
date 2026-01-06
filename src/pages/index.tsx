import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiPost } from '@/lib/fetcher';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

const IndexPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    general?: string;
  }>({});
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const validateForm = () => {
    const newErrors: {
      username?: string;
      password?: string;
      general?: string;
    } = {};

    if (!username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (username.trim().length < 3) {
      newErrors.username =
        "Le nom d'utilisateur doit contenir au moins 3 caractères";
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      newErrors.password =
        'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!validateForm()) {
      showToast({
        type: 'error',
        title: 'Formulaire invalide',
        message: 'Veuillez corriger les erreurs dans le formulaire',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost<{
        success: boolean;
        token?: string;
        user?: any;
        message?: string;
      }>('/api/auth/login', {
        username: username.trim(),
        password,
      });

      if (response.success && response.token && response.user) {
        // Stocker le token dans un cookie
        document.cookie = `authToken=${response.token}; path=/; max-age=43200; samesite=strict`;

        // Mettre à jour l'état utilisateur
        setUser(response.user);

        showToast({
          type: 'success',
          title: 'Connexion réussie',
          message: 'Bienvenue dans votre espace Fonaredd',
        });

        // Rediriger vers la page d'accueil
        router.push('/home');
      } else {
        const errorMessage = response.message || 'Identifiants incorrects';
        setErrors({ general: errorMessage });
        showToast({
          type: 'error',
          title: 'Échec de la connexion',
          message: errorMessage,
        });
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      let errorMessage = 'Erreur de connexion. Veuillez réessayer.';

      if (error.response?.status === 401) {
        errorMessage = "Nom d'utilisateur ou mot de passe incorrect";
      } else if (error.response?.status === 429) {
        errorMessage = 'Trop de tentatives de connexion. Veuillez patienter.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erreur du serveur. Veuillez réessayer plus tard.';
      } else if (!navigator.onLine) {
        errorMessage = 'Aucune connexion internet. Vérifiez votre connexion.';
      }

      setErrors({ general: errorMessage });
      showToast({
        type: 'error',
        title: 'Erreur de connexion',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-emerald-200 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo et titre */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Fond National REDD"
              width={200}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Connexion</h2>
          <p className="mt-2 text-sm text-gray-600">
            Accédez à votre espace Fonaredd
          </p>
        </div>

        {/* Message d'erreur général */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-400 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de connexion
                </h3>
                <p className="text-sm text-red-700 mt-1">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire de connexion */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-green-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Champ nom d'utilisateur */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className={`h-5 w-5 ${errors.username ? 'text-red-400' : 'text-gray-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) clearErrors();
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.username
                      ? 'border-red-300 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Entrez votre nom d'utilisateur"
                />
              </div>
              {errors.username && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <svg
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {errors.username}
                </div>
              )}
            </div>

            {/* Champ mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className={`h-5 w-5 ${errors.password ? 'text-red-400' : 'text-gray-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) clearErrors();
                  }}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.password
                      ? 'border-red-300 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Entrez votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <svg
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {errors.password}
                </div>
              )}
            </div>

            {/* Bouton de connexion */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Connexion en cours...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    Se connecter
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Signature */}
        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 shadow-lg border border-green-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-green-700">Développé par</span>
            </p>
            <p className="text-lg font-bold text-green-800 mt-1">
              Schadrack MPAKA MABI
            </p>
            <div className="mt-2 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Système sécurisé</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Informations de sécurité */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <svg
                className="h-4 w-4 text-green-500 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Connexion sécurisée
            </div>
            <div className="flex items-center">
              <svg
                className="h-4 w-4 text-green-500 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Données protégées
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
