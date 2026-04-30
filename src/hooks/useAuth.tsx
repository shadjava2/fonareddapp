import { UserProfile } from '@/lib/auth';
import { apiPost, handleApiError } from '@/lib/fetcher';
import {
  hasAllPermissions as rbacHasAllPermissions,
  hasAnyPermission as rbacHasAnyPermission,
  hasPermission as rbacHasPermission,
  hasServiceAccess as rbacHasServiceAccess,
} from '@/lib/rbac';
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
  roleNom?: string | null;
  initPassword: any;
  permissions: string[];
  services: number[];
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
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          nom: data.user.nom,
          prenom: data.user.prenom,
          username: data.user.username,
          mail: data.user.mail,
          phone: data.user.phone,
          fkRole: data.user.fkRole,
          roleNom: data.user.roleNom ?? null,
          initPassword: data.user.initPassword,
          permissions: data.user.permissions ?? [],
          services: Array.isArray(data.user.services)
            ? data.user.services.map(Number)
            : [],
        });
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('checkAuth:', e);
      setUser(null);
    } finally {
      isCheckingRef.current = false;
    }
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
            roleNom: data.user.roleNom ?? null,
            initPassword: data.user.initPassword,
            permissions: data.user.permissions ?? [],
            services: Array.isArray(data.user.services)
              ? data.user.services.map(Number)
              : [],
          };

          console.log(
            `✅ Utilisateur connecté: ${realUser.prenom} ${realUser.nom} (ID: ${realUser.id})`
          );
          setUser(realUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors de la récupération de l'utilisateur:",
          error
        );
        setUser(null);
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
  const profile = user as unknown as UserProfile | null;

  const hasPermission = (permission: string) =>
    rbacHasPermission(profile, permission);

  const hasRole = (roleId: number) => {
    if (!user) return false;
    return String(user.fkRole) === String(roleId);
  };

  const hasServiceAccess = (serviceId: number) =>
    rbacHasServiceAccess(profile, serviceId);

  const hasAnyPermission = (permissions: string[]) =>
    rbacHasAnyPermission(profile, permissions);

  const hasAllPermissions = (permissions: string[]) =>
    rbacHasAllPermissions(profile, permissions);

  return {
    hasPermission,
    hasRole,
    hasServiceAccess,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions ?? [],
    services: user?.services ?? [],
  };
}
