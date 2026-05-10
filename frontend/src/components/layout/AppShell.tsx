import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import clsx from 'clsx';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  allow: readonly Role[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', allow: ['APPLICANT', 'REVIEWER', 'APPROVER', 'ADMIN'] },
  { to: '/applications', label: 'Applications', allow: ['APPLICANT', 'REVIEWER', 'APPROVER', 'ADMIN'] },
  { to: '/admin/users', label: 'Users', allow: ['ADMIN'] },
  { to: '/admin/license-types', label: 'License types', allow: ['ADMIN'] },
  { to: '/admin/audit', label: 'Audit log', allow: ['ADMIN'] },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'block w-full text-left md:w-auto md:inline-block px-3 py-3 md:py-1.5 rounded text-sm border min-h-[44px] md:min-h-0 flex items-center md:inline-flex',
    isActive
      ? 'bg-gold text-white border-gold'
      : 'bg-transparent text-white border-transparent hover:bg-gold hover:border-gold',
  );

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-6 w-6 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      {open ? (
        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, role, logout, forbiddenMessage, clearForbidden, flashForbidden } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const msg = (location.state as { accessDenied?: string } | null)?.accessDenied;
    if (!msg) return;
    flashForbidden(msg);
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true });
  }, [location.state, location.pathname, location.search, location.hash, flashForbidden, navigate]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (!user || !role) {
    return null;
  }

  const visibleNav = NAV_ITEMS.filter((item) => item.allow.includes(role));

  return (
    <div className="min-h-screen flex flex-col bg-white text-ink">
      <header className="bg-brown text-white border-b-2 border-gold">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 py-3 md:h-14 md:py-0 md:items-center">
            <Link
              to="/dashboard"
              className="font-bold tracking-tight text-white text-sm sm:text-base min-w-0 shrink pr-2 leading-tight"
              aria-label="BNR licensing portal — home"
            >
              <span className="break-words">BNR</span>
            </Link>

            <nav aria-label="Primary" className="hidden md:flex md:flex-1 md:justify-center md:gap-1 lg:gap-2">
              {visibleNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden xl:inline text-sm max-w-[14rem] truncate" aria-label="Current user">
                {user.fullName} <span className="text-white">({role})</span>
              </span>
              <Button
                variant="secondary"
                className="text-xs sm:text-sm !px-2.5 sm:!px-4 whitespace-nowrap"
                onClick={() => {
                  void (async () => {
                    await logout();
                    navigate('/login', { replace: true });
                  })();
                }}
              >
                Sign out
              </Button>
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center rounded border border-white/40 p-2 text-white hover:bg-gold min-h-[44px] min-w-[44px]"
                aria-expanded={menuOpen}
                aria-controls="primary-nav-mobile"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </div>

          <nav
            id="primary-nav-mobile"
            className={clsx(
              'md:hidden border-t border-gold',
              menuOpen ? 'block' : 'hidden',
            )}
            aria-label="Primary navigation"
          >
            <div className="flex flex-col pb-3 pt-1">
              {visibleNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
              <p className="px-3 py-2 text-sm text-white border-t border-gold mt-1 xl:hidden break-words">
                <span className="font-semibold">{user.fullName}</span>
                <span className="text-white"> ({role})</span>
              </p>
            </div>
          </nav>
        </div>
      </header>

      {forbiddenMessage ? (
        <div
          role="alert"
          className="bg-white text-ink border-b-2 border-brown px-3 sm:px-4 py-2 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0">
            <span className="font-bold text-brown">Notice:</span> {forbiddenMessage}
          </span>
          <button type="button" onClick={clearForbidden} className="underline text-brown shrink-0 text-left sm:text-right">
            Dismiss
          </button>
        </div>
      ) : null}

      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
