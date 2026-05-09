import { http } from './http';
import type { AuditLogEntry } from '@/types';

export const auditApi = {
  async byApplication(applicationId: number): Promise<AuditLogEntry[]> {
    return (await http.get<AuditLogEntry[]>(`/admin/audit-log/by-application/${applicationId}`)).data;
  },
  async byUser(userId: number): Promise<AuditLogEntry[]> {
    return (await http.get<AuditLogEntry[]>(`/admin/audit-log/by-user/${userId}`)).data;
  },
};
