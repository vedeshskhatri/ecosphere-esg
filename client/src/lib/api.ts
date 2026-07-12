import axios from 'axios';
import type { AxiosResponse } from 'axios';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ecosphere_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle auth failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('ecosphere_token');
      localStorage.removeItem('ecosphere_user_id');
      // If we are not already on the login page, redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: any;
}

/**
 * API wrapper helpers
 */
export async function get<T>(url: string, params?: any): Promise<T> {
  const response: AxiosResponse<ApiResponse<T>> = await api.get(url, { params });
  return response.data.data;
}

export async function post<T>(url: string, data?: any): Promise<T> {
  const response: AxiosResponse<ApiResponse<T>> = await api.post(url, data);
  return response.data.data;
}

export async function patch<T>(url: string, data?: any): Promise<T> {
  const response: AxiosResponse<ApiResponse<T>> = await api.patch(url, data);
  return response.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const response: AxiosResponse<ApiResponse<T>> = await api.delete(url);
  return response.data.data;
}

export default api;
