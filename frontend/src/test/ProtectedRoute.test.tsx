import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import type { AuthStatus } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

function mockAuthStatus(status: AuthStatus): void {
  (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    status,
    user: null,
    role: null,
    forbiddenMessage: null,
    login: vi.fn(),
    logout: vi.fn(),
    clearForbidden: vi.fn(),
    flashForbidden: vi.fn(),
  });
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div data-testid="dashboard">dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('redirects unauthenticated users to /login', () => {
    mockAuthStatus('unauthenticated');
    renderAt('/dashboard');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('lets authenticated users through to the protected route', () => {
    mockAuthStatus('authenticated');
    renderAt('/dashboard');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders a non-flashy loading state while auth is initialising', () => {
    mockAuthStatus('initialising');
    renderAt('/dashboard');
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
