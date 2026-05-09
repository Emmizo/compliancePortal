import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { describeError } from '@/api/http';
import { Button } from '@/components/Button';
import { TextField } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ALL_ROLES, type Role } from '@/types';
import { createUserSchema, type CreateUserInput } from '@/lib/schemas';

const SELECT_CLASSES =
  'mt-1 block w-full rounded-md border border-brown bg-white text-ink px-3 py-2 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState<string | null>(null);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: () => usersApi.list() });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', fullName: '', password: '', role: 'APPLICANT' },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) =>
      usersApi.create({
        email: input.email,
        fullName: input.fullName,
        password: input.password,
        role: input.role as Role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      reset();
    },
    onError: (err) => setCreateError(describeError(err)),
  });

  const changeRole = useMutation({
    mutationFn: (vars: { userId: number; role: Role }) =>
      usersApi.changeRole(vars.userId, { role: vars.role }),
    onMutate: () => setRoleChangeError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err) => setRoleChangeError(describeError(err)),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">Users</h1>
        <p className="text-sm text-ink max-w-prose">Manage user accounts and roles for the portal.</p>
      </header>

      <section className="bg-white border border-brown rounded-lg p-4 sm:p-6">
        <h2 className="font-semibold text-gold">Create a new user</h2>
        <form
          onSubmit={handleSubmit((values) => {
            setCreateError(null);
            createMutation.mutate(values);
          })}
          className="mt-3 grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <TextField label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <TextField label="Full name" {...register('fullName')} error={errors.fullName?.message} />
          <TextField
            label="Initial password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <label className="block text-sm">
            <span className="text-ink font-semibold">Role</span>
            <select {...register('role')} className={SELECT_CLASSES}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.role ? (
              <p role="alert" className="mt-1 text-brown text-xs font-bold">
                Error: {String(errors.role.message)}
              </p>
            ) : null}
          </label>
          {createError ? (
            <p role="alert" className="sm:col-span-2 text-sm text-ink">
              <span className="font-bold text-brown">Error:</span> {createError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={createMutation.isPending}>
              Create user
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gold">All users</h2>
        {roleChangeError ? (
          <p role="alert" className="text-sm text-ink border-2 border-brown rounded-md p-2 bg-white">
            <span className="font-bold text-brown">Could not update role:</span> {roleChangeError}
          </p>
        ) : null}
        {usersQuery.isLoading ? (
          <LoadingState />
        ) : usersQuery.isError ? (
          <ErrorState
            message={describeError(usersQuery.error)}
            onRetry={() => usersQuery.refetch()}
          />
        ) : !usersQuery.data || usersQuery.data.length === 0 ? (
          <EmptyState title="No users yet" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-brown bg-white -mx-1 sm:mx-0 touch-pan-x">
            <table className="min-w-[520px] w-full text-sm text-ink">
              <thead className="bg-white text-xs uppercase tracking-wide text-brown border-b border-brown">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.map((u) => (
                  <tr key={u.id} className="border-t border-brown">
                    <td className="px-3 py-2 font-semibold text-ink">{u.email}</td>
                    <td className="px-3 py-2 text-ink">{u.fullName}</td>
                    <td className="px-3 py-2">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          changeRole.mutate({ userId: u.id, role: e.target.value as Role })
                        }
                        className="rounded-md border border-brown bg-white text-ink px-2 py-1 text-sm"
                        disabled={changeRole.isPending}
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-ink">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
