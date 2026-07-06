import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { loadBranding } from "../api/branding";

const AuthContext = createContext(null);
const REFRESH_INTERVAL = 45 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("pf_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("pf_token"));
  const [idleTimeout, setIdleTimeout] = useState(60 * 60 * 1000);

  const idleTimer    = useRef(null);
  const refreshTimer = useRef(null);

  useEffect(() => {
    loadBranding().then(b => {
      const minutes = parseInt(b.session_timeout_minutes) || 60;
      setIdleTimeout(minutes * 60 * 1000);
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("pf_user");
    localStorage.removeItem("pf_token");
    clearTimeout(idleTimer.current);
    clearInterval(refreshTimer.current);
  }, []);

  const login = useCallback((userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem("pf_user", JSON.stringify(userData));
    localStorage.setItem("pf_token", accessToken);
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (token) {
      idleTimer.current = setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, idleTimeout);
    }
  }, [token, logout, idleTimeout]);

  useEffect(() => {
    if (!token) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
    };
  }, [token, resetIdleTimer]);

  useEffect(() => {
    if (!token) return;
    refreshTimer.current = setInterval(async () => {
      try {
        await api.get("/auth/me");
      } catch {
        logout();
        window.location.href = "/login";
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(refreshTimer.current);
  }, [token, logout]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      r => r,
      err => {
        if (err.response?.status === 401) {
          logout();
          window.location.href = "/login";
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);