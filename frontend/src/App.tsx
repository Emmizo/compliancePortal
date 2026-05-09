import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApplicationListPage } from '@/pages/ApplicationListPage';
import { ApplicationNewPage } from '@/pages/ApplicationNewPage';
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage';
import { ApplicationAuditPage } from '@/pages/ApplicationAuditPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';
import { AdminLicenseTypesPage } from '@/pages/admin/AdminLicenseTypesPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleRoute } from '@/routes/RoleRoute';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <AppShell>
              <Navigate to="/dashboard" replace />
            </AppShell>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/applications"
          element={
            <AppShell>
              <ApplicationListPage />
            </AppShell>
          }
        />

        <Route element={<RoleRoute allow={['APPLICANT']} />}>
          <Route
            path="/applications/new"
            element={
              <AppShell>
                <ApplicationNewPage />
              </AppShell>
            }
          />
        </Route>

        <Route
          path="/applications/:id"
          element={
            <AppShell>
              <ApplicationDetailPage />
            </AppShell>
          }
        />
        <Route element={<RoleRoute allow={['REVIEWER', 'APPROVER', 'ADMIN']} />}>
          <Route
            path="/applications/:id/audit"
            element={
              <AppShell>
                <ApplicationAuditPage />
              </AppShell>
            }
          />
        </Route>

        <Route element={<RoleRoute allow={['ADMIN']} />}>
          <Route
            path="/admin/users"
            element={
              <AppShell>
                <AdminUsersPage />
              </AppShell>
            }
          />
          <Route
            path="/admin/license-types"
            element={
              <AppShell>
                <AdminLicenseTypesPage />
              </AppShell>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AppShell>
                <AdminAuditPage />
              </AppShell>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
