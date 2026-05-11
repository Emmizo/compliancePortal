import { http } from './http';
import type { LoginRequest, LoginResponse, User } from '@/types';

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return (await http.post<LoginResponse>('/auth/login', payload)).data;
  },
  async me(): Promise<User> {
    return (await http.get<User>('/auth/me')).data;
  },
  async logout(): Promise<void> {
    await http.post('/auth/logout');
  },
};
