import { api, clearAuth } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  email: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

// Register a new user
export async function registerUser(data: RegisterData) {
  const response = await api.post("/auth/register/", data);
  return response.data;
}

// Log in and save JWT tokens
export async function loginUser(
  credentials: AuthCredentials
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(
    "/auth/login/",
    credentials
  );

  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);

  return data;
}

// Get currently authenticated user
export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}

// Log out and remove stored tokens
export function logout(): void {
  clearAuth();
}





