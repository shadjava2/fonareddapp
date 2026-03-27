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

/** Message lisible pour l’UI (timeouts, SMTP lent, proxy, corps non-JSON). */
export function getAxiosErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) return error.message;
    return 'Erreur inconnue';
  }

  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'Délai dépassé : le serveur met trop longtemps à répondre (souvent l’envoi e-mail ou la base de données). Réessayez dans un instant ou contactez l’administrateur.';
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (data && typeof data === 'object' && data !== null && 'message' in data) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }

  if (status === 503) {
    return "Service temporairement indisponible (souvent : envoi d'e-mails / SMTP non configuré sur le serveur).";
  }
  if (status === 502) {
    return "Le serveur n'a pas pu envoyer l'e-mail (erreur SMTP). Vérifiez la configuration ou réessayez plus tard.";
  }
  if (status === 504 || status === 408) {
    return 'Délai dépassé côté serveur ou proxy.';
  }
  if (status === 429) {
    return 'Trop de requêtes. Patientez avant de réessayer.';
  }
  if (status === 404) {
    return 'API introuvable. Vérifiez que l’application est à jour et redéployée.';
  }

  if (error.request && !error.response) {
    return 'Aucune réponse du serveur. Vérifiez la connexion réseau ou que l’application est démarrée.';
  }

  return error.message || 'Erreur réseau ou serveur. Réessayez plus tard.';
}
