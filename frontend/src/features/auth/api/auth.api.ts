import type { LoginPayload, RegisterPayload, LoginResponse } from '../types/auth.types';

const API_URL = 'http://localhost:3000/api';

export const authApi = {
  async login(credentials: LoginPayload): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha ao efetuar login');
    return data;
  },

  async register(data: RegisterPayload) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || 'Falha ao realizar cadastro');
    return resData;
  },
};