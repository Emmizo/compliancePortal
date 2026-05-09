import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { describeError } from '@/api/http';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { TextField } from '@/components/FormField';
import { loginSchema, type LoginInput } from '@/lib/schemas';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      const target = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setServerError(describeError(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center px-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">BNR</h1>
          <p className="text-sm text-ink mt-1 max-w-prose mx-auto">
            Sign in with the email and password for your account. If you are evaluating the portal, use the
            seeded users from the project README or the account your administrator created.
          </p>
        </header>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-lg border-2 border-brown p-4 sm:p-6 space-y-4"
          noValidate
        >
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {serverError ? (
            <p role="alert" className="text-sm text-ink bg-white border-2 border-brown rounded p-2">
              <span className="font-bold text-brown">Error:</span> {serverError}
            </p>
          ) : null}
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
