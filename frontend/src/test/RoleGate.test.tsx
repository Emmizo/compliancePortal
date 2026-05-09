import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from '@/components/RoleGate';
import type { Role } from '@/types';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

function mockRole(role: Role | null): void {
  (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    role,
    user: role ? { id: 1, email: 'x@bnr.rw', fullName: 'X', role } : null,
    status: role ? 'authenticated' : 'unauthenticated',
    forbiddenMessage: null,
    login: vi.fn(),
    logout: vi.fn(),
    clearForbidden: vi.fn(),
    flashForbidden: vi.fn(),
  });
}

describe('RoleGate (test category #2: role-based rendering)', () => {
  beforeEach(() => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('renders children when the role is in the allow-list', () => {
    mockRole('REVIEWER');
    render(
      <RoleGate allow={['REVIEWER', 'ADMIN']}>
        <button data-testid="reviewer-only">Begin review</button>
      </RoleGate>,
    );
    expect(screen.getByTestId('reviewer-only')).toBeInTheDocument();
  });

  it('does NOT render children when the role is not in the allow-list', () => {
    mockRole('APPLICANT');
    render(
      <RoleGate allow={['REVIEWER']}>
        <button data-testid="reviewer-only">Begin review</button>
      </RoleGate>,
    );
    expect(screen.queryByTestId('reviewer-only')).not.toBeInTheDocument();
  });

  it('does not render anything when no user is authenticated', () => {
    mockRole(null);
    render(
      <RoleGate allow={['ADMIN']}>
        <button data-testid="admin-only">Manage users</button>
      </RoleGate>,
    );
    expect(screen.queryByTestId('admin-only')).not.toBeInTheDocument();
  });

  it('an APPLICANT cannot see reviewer/approver/admin actions', () => {
    mockRole('APPLICANT');
    render(
      <>
        <RoleGate allow={['REVIEWER']}>
          <button data-testid="reviewer-action" />
        </RoleGate>
        <RoleGate allow={['APPROVER']}>
          <button data-testid="approver-action" />
        </RoleGate>
        <RoleGate allow={['ADMIN']}>
          <button data-testid="admin-action" />
        </RoleGate>
        <RoleGate allow={['APPLICANT']}>
          <button data-testid="applicant-action" />
        </RoleGate>
      </>,
    );
    expect(screen.queryByTestId('reviewer-action')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approver-action')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-action')).not.toBeInTheDocument();
    expect(screen.getByTestId('applicant-action')).toBeInTheDocument();
  });

  it('a REVIEWER cannot see approve/reject buttons', () => {
    mockRole('REVIEWER');
    render(
      <RoleGate allow={['APPROVER']}>
        <button data-testid="approve-button">Approve</button>
      </RoleGate>,
    );
    expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument();
  });
});
