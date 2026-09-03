export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user_id: string;
  role: Role;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'BUYER' | 'SELLER';
}

export interface LoginPayload {
  email: string;
  password: string;
}