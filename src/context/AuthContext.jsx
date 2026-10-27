import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onUnauthorized, tokenStore } from '../api/client';
import { login as loginRequest } from '../api/services';

const AuthContext = createContext(null);

function decodeEmail(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.email || payload.sub || null;
  } catch {
    return null;
  }
}

function isExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return exp ? exp * 1000 < Date.now() : false;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = tokenStore.get();
    if (t && isExpired(t)) {
      tokenStore.clear();
      return null;
    }
    return t;
  });

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
  }, []);

  useEffect(() => onUnauthorized(logout), [logout]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    if (!data?.token) throw new Error('No token returned');
    tokenStore.set(data.token);
    setToken(data.token);
  }, []);

  const value = useMemo(
    () => ({ token, isAuthenticated: !!token, user: token ? decodeEmail(token) : null, login, logout }),
    [token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
