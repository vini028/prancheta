import { useAuthStore } from '../../auth/store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Tratamento de 401 (não alterado)
  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // Respostas sem conteúdo (ex: DELETE 204)
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  // Para respostas com conteúdo, tenta parsear JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Ocorreu um erro na requisição.');
    }
    return data as T;
  }

  // Fallback: se não for JSON, retorna como texto (caso raro)
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || 'Ocorreu um erro na requisição.');
  }
  return text as unknown as T;
}