import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types';

interface RoleRouteProps {
  allow: readonly Role[];
}

const AUDIT_TRAIL_PATH = /^\/applications\/(\d+)\/audit\/?$/;

export function RoleRoute({ allow }: RoleRouteProps) {
  const { role } = useAuth();
  const location = useLocation();

  if (role === null) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(role)) {
    if (role === 'APPLICANT') {
      const auditMatch = location.pathname.match(AUDIT_TRAIL_PATH);
      if (auditMatch) {
        return (
          <Navigate
            to={`/applications/${auditMatch[1]}`}
            replace
            state={{
              accessDenied:
                'The activity history view is for internal review staff. Your status and next steps are on this page.',
            }}
          />
        );
      }
      return (
        <Navigate
          to="/dashboard"
          replace
          state={{
            accessDenied:
              'That area is for internal review staff. Use Dashboard or Applications to work on your own filings.',
          }}
        />
      );
    }

    const rolesLabel = allow.join(', ');
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ accessDenied: `That page is only available to users with one of these roles: ${rolesLabel}.` }}
      />
    );
  }
  return <Outlet />;
}
