
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type User = {
  id: number;
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (access: string, refresh: string) => Promise<void>;
  logout: () => void;
};

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

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const fetchUser = async (token: string): Promise<User> => {
    const response = await fetch(
      "http://localhost:8000/api/auth/me/",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Unable to authenticate user");
    }

    return response.json();
  };

  const login = async (access: string, refresh: string) => {
    const currentUser = await fetchUser(access);

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    setUser(currentUser);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchUser(token);
        setUser(currentUser);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        loading,
        login,
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
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
