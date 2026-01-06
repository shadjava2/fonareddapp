import { apiPost, handleApiError } from '@/lib/fetcher';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface User {
  id: any;
  nom: string | null;
  prenom: string | null;
  username: string;
  mail: string | null;
  phone: string | null;
  fkRole: any;
  initPassword: any;
  permissions: string[];
  services: any[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isCheckingRef = useRef(false);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiPost<{
        success: boolean;
        user?: User;
        message?: string;
      }>('/api/auth/login', { username, password });

      if (response.success && response.user) {
        setUser(response.user);
        // Forcer un checkAuth pour récupérer les permissions/services à jour (si calculés côté serveur)
        await checkAuth();
        return { success: true };
      } else {
        return {
          success: false,
          message: response.message || 'Erreur de connexion',
        };
      }
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, message: apiError.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiPost('/api/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setUser(null);
    }
  };

  const checkAuth = async () => {
    // Désactivé en mode développement pour éviter les redirections
    console.log('🔍 checkAuth désactivé en mode développement');
    return;
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  useEffect(() => {
    // Récupérer l'utilisateur réel depuis l'API
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (data.success && data.user) {
          const realUser: User = {
            id: data.user.id,
            nom: data.user.nom,
            prenom: data.user.prenom,
            username: data.user.username,
            mail: data.user.mail,
            phone: data.user.phone,
            fkRole: data.user.fkRole,
            initPassword: data.user.initPassword,
            permissions: data.user.permissions || ['*'],
            services: data.user.services || ['*'],
          };

          console.log(
            `✅ Utilisateur connecté: ${realUser.prenom} ${realUser.nom} (ID: ${realUser.id})`
          );
          setUser(realUser);
        } else {
          // Fallback: Utilisateur par défaut si l'API échoue
          console.warn(
            "⚠️ Impossible de récupérer l'utilisateur, utilisation du fallback"
          );
          const staticUser: User = {
            id: 33, // ID par défaut basé sur votre demande
            nom: 'Utilisateur',
            prenom: 'Test',
            username: 'user33',
            mail: 'user33@fonaredd.com',
            phone: null,
            fkRole: 1,
            initPassword: null,
            permissions: ['*'],
            services: ['*'],
          };
          setUser(staticUser);
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors de la récupération de l'utilisateur:",
          error
        );
        // Fallback en cas d'erreur
        const staticUser: User = {
          id: 33,
          nom: 'Utilisateur',
          prenom: 'Test',
          username: 'user33',
          mail: 'user33@fonaredd.com',
          phone: null,
          fkRole: 1,
          initPassword: null,
          permissions: ['*'],
          services: ['*'],
        };
        setUser(staticUser);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []); // Dépendance vide pour charger une seule fois

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    updateUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}

// Hook pour vérifier les permissions
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string) => {
    // Mode développement : accès libre à tous les modules
    return true;
  };

  const hasRole = (roleId: number) => {
    return user?.fkRole === roleId;
  };

  const hasServiceAccess = (serviceId: number) => {
    // Mode développement : accès libre à tous les services
    return true;
  };

  const hasAnyPermission = (permissions: string[]) => {
    // Mode développement : accès libre à tous les modules
    return true;
  };

  const hasAllPermissions = (permissions: string[]) => {
    // Mode développement : accès libre à tous les modules
    return true;
  };

  return {
    hasPermission,
    hasRole,
    hasServiceAccess,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
    services: user?.services || [],
  };
}
