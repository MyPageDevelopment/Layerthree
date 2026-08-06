import { User } from '@/types';

export const setAuthToken = (token: string, keepSession: boolean = true) => {
  if (typeof window !== 'undefined') {
    if (keepSession) {
      localStorage.setItem('access_token', token);
      sessionStorage.removeItem('access_token');
    } else {
      sessionStorage.setItem('access_token', token);
      localStorage.removeItem('access_token');
    }
  }
};

export const getAuthToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  return token || undefined;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
  }
};

export const setUser = (user: User, keepSession: boolean = true) => {
  if (typeof window !== 'undefined') {
    if (keepSession) {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.removeItem('user');
    } else {
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('user');
    }
  }
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const removeUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  }
};

export const logout = () => {
  removeAuthToken();
  removeUser();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.role === 'GERENTE' || user?.role === 'SUPER_ADMIN' || user?.role === 'JEFE_PROYECTO';
};

export const isSuperAdmin = (): boolean => {
  const user = getUser();
  return user?.role === 'SUPER_ADMIN';
};

export const canManageInventory = (): boolean => {
  const user = getUser();
  return user?.role === 'SUPER_ADMIN' || user?.role === 'GERENTE' || user?.role === 'BODEGUERO';
};

export const hasModuleAccess = (module: string): boolean => {
  const user = getUser();
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return Array.isArray(user.allowedModules) && user.allowedModules.includes(module);
};
