import axios from "axios";

const API_URL = "http://localhost:8000/api/auth/";

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  email: string;
}

export const registerUser = async (data: RegisterData) => {
  const response = await axios.post(
    `${API_URL}register/`,
    data
  );

  return response.data;
};

export const loginUser = async (data: AuthCredentials) => {
  const response = await axios.post(
    `${API_URL}login/`,
    data
  );

  return response.data;
};

export const getCurrentUser = async (accessToken: string) => {
  const response = await axios.get(
    `${API_URL}me/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};

