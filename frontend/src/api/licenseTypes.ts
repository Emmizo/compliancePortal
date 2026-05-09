import { http } from './http';
import type { LicenseType } from '@/types';

export const licenseTypesApi = {
  async listActive(): Promise<LicenseType[]> {
    return (await http.get<LicenseType[]>('/license-types')).data;
  },

  async adminList(): Promise<LicenseType[]> {
    return (await http.get<LicenseType[]>('/admin/license-types')).data;
  },

  async adminCreate(payload: { code: string; label: string }): Promise<LicenseType> {
    return (await http.post<LicenseType>('/admin/license-types', payload)).data;
  },

  async adminSetEnabled(id: number, enabled: boolean): Promise<LicenseType> {
    return (await http.patch<LicenseType>(`/admin/license-types/${id}/enabled`, { enabled })).data;
  },
};
