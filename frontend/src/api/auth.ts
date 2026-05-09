import { http } from './http';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from '@/types';

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return (await http.post<LoginResponse>('/auth/login', payload)).data;
  },
  async register(payload: RegisterRequest): Promise<User> {
    return (await http.post<User>('/auth/register', payload)).data;
  },
  async me(): Promise<User> {
    return (await http.get<User>('/auth/me')).data;
  },
};
