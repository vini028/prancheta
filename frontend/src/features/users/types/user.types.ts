export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BUYER' | 'SELLER';
  created_at?: string;
}

export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
}