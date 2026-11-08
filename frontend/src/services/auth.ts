import axios from "axios";

const API_URL = "http://localhost:8000/api/auth";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export async function login(
  credentials: LoginCredentials
): Promise<AuthTokens> {
  const response = await axios.post<AuthTokens>(
    `${API_URL}/login/`,
    credentials
  );

  return response.data;
}
