import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Configuration de base pour axios
// Utiliser une baseURL relative pour que l'app marche en localhost ET via IP/LAN
const fetcher: AxiosInstance = axios.create({
  baseURL: '/',
  timeout: 10000,
  withCredentials: true, // Pour les cookies HttpOnly
});

// Intercepteur pour les requêtes
fetcher.interceptors.request.use(
  (config) => {
    // Ajouter des headers par défaut si nécessaire
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
fetcher.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Gérer les erreurs globalement
    const status = error.response?.status;
    const serverMessage: string | undefined = error.response?.data?.message;
    const finalMessage = serverMessage || error.message || 'Erreur inconnue';

    // Les notifications toast sont gérées dans les composants

    if (status === 401) {
      if (typeof window !== 'undefined') {
        // rester sur la page de login, mais informer clairement
      }
    }
    return Promise.reject(error);
  }
);

export default fetcher;

// Types utilitaires pour les réponses API
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// Fonctions utilitaires pour les appels API
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await fetcher.get(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await fetcher.post(url, data, config);
  return response.data;
}

export async function apiPut<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await fetcher.put(url, data, config);
  return response.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await fetcher.delete(url, config);
  return response.data;
}

// Fonction pour gérer les erreurs API
export function handleApiError(error: any): ApiError {
  if (error.response) {
    // Erreur de réponse du serveur
    return {
      message:
        error.response.data?.message || error.message || 'Erreur du serveur',
      status: error.response.status,
      details: error.response.data,
    };
  } else if (error.request) {
    // Erreur de requête (pas de réponse)
    return {
      message: 'Impossible de contacter le serveur',
      status: 0,
      details: error.request,
    };
  } else {
    // Erreur de configuration
    return {
      message: error.message || 'Erreur inconnue',
      status: 0,
      details: error,
    };
  }
}
