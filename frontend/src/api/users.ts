import { http } from './http';
import type { AdminUser, ChangeRoleRequest, CreateUserRequest } from '@/types';

export const usersApi = {
  async list(): Promise<AdminUser[]> {
    return (await http.get<AdminUser[]>('/admin/users')).data;
  },
  async create(payload: CreateUserRequest): Promise<AdminUser> {
    return (await http.post<AdminUser>('/admin/users', payload)).data;
  },
  async changeRole(userId: number, payload: ChangeRoleRequest): Promise<AdminUser> {
    return (await http.patch<AdminUser>(`/admin/users/${userId}/role`, payload)).data;
  },
};
