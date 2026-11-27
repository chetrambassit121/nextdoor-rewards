import { api, clearAuth } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
  is_guest: boolean;
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

export interface GuestLoginResponse extends LoginResponse {
  user: User;
}

// Shared JWT token storage
function saveTokens(tokens: LoginResponse): void {
  localStorage.setItem("access_token", tokens.access);
  localStorage.setItem("refresh_token", tokens.refresh);
}

// Register a new user
export async function registerUser(data: RegisterData) {
  const response = await api.post("/auth/register/", data);
  return response.data;
}

// Log in as a registered user
export async function loginUser(
  credentials: AuthCredentials
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(
    "/auth/login/",
    credentials
  );

  saveTokens(data);

  return data;
}

// Log in as a guest user
export async function loginGuestUser():
  Promise<GuestLoginResponse> {
  const { data } = await api.post<GuestLoginResponse>(
    "/auth/guest-login/"
  );

  saveTokens(data);

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
