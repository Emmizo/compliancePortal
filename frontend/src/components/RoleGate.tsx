import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types';

interface RoleGateProps {
  allow: readonly Role[];
  children: ReactNode;
}



export function RoleGate({ allow, children }: RoleGateProps) {
  const { role } = useAuth();
  if (role === null || !allow.includes(role)) {
    return null;
  }
  return <>{children}</>;
}
