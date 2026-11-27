import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginUser as loginRequest,
  loginGuestUser as guestLoginRequest,
  logout as logoutRequest,
  getCurrentUser,
  type User,
} from "../services/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isGuest = user?.is_guest === true;

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const refresh = localStorage.getItem("refresh_token");

      if (!refresh) {
        if (active) setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (active) setUser(currentUser);
      } catch {
        if (active) {
          logoutRequest();
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener("auth:logout", handleLogout);

    void restoreSession();

    return () => {
      active = false;

      window.removeEventListener(
        "auth:logout",
        handleLogout
      );
    };
  }, []);

  async function completeLogin() {
    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);
    } catch (error) {
      logoutRequest();
      setUser(null);

      throw error;
    }
  }

  async function login(
    username: string,
    password: string
  ) {
    await loginRequest({ username, password });

    await completeLogin();
  }

  async function loginAsGuest() {
    await guestLoginRequest();

    await completeLogin();
  }

  function logout() {
    logoutRequest();

    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        login,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
}
