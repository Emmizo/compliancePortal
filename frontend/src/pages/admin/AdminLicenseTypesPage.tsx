import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { licenseTypesApi } from '@/api/licenseTypes';
import { describeError } from '@/api/http';
import { Button } from '@/components/Button';
import { TextField } from '@/components/FormField';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { createLicenseTypeSchema, type CreateLicenseTypeInput } from '@/lib/schemas';
import clsx from 'clsx';

function AvailabilityBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase',
        enabled ? 'bg-gold text-white' : 'bg-brown text-white',
      )}
    >
      {enabled ? 'Active' : 'Disabled'}
    </span>
  );
}

export function AdminLicenseTypesPage() {
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'license-types'],
    queryFn: () => licenseTypesApi.adminList(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateLicenseTypeInput>({
    resolver: zodResolver(createLicenseTypeSchema),
    defaultValues: { code: '', label: '' },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateLicenseTypeInput) =>
      licenseTypesApi.adminCreate({ code: input.code.trim(), label: input.label.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'license-types'] });
      queryClient.invalidateQueries({ queryKey: ['license-types'] });
      reset();
    },
    onError: (err) => setCreateError(describeError(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: number; enabled: boolean }) =>
      licenseTypesApi.adminSetEnabled(vars.id, vars.enabled),
    onMutate: () => setToggleError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'license-types'] });
      queryClient.invalidateQueries({ queryKey: ['license-types'] });
    },
    onError: (err) => setToggleError(describeError(err)),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">License types</h1>
        <p className="text-sm text-ink max-w-prose">
          Define which license categories applicants may choose when starting an application. Disabled types stay on
          existing records but cannot be selected for new drafts.
        </p>
      </header>

      <section className="bg-white border border-brown rounded-lg p-4 sm:p-6">
        <h2 className="font-semibold text-gold">Add a license type</h2>
        <p className="text-xs text-ink mt-1">
          Use a short stable code (e.g. <span className="font-mono">PAYMENT_SERVICE</span>) and a clear label for the
          dropdown.
        </p>
        <form
          onSubmit={handleSubmit((values) => {
            setCreateError(null);
            createMutation.mutate(values);
          })}
          className="mt-3 grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <TextField
            label="Code"
            {...register('code')}
            error={errors.code?.message}
            hint="Letters, digits, underscores — stored in uppercase."
            autoComplete="off"
          />
          <TextField label="Display label" {...register('label')} error={errors.label?.message} />
          {createError ? (
            <p role="alert" className="sm:col-span-2 text-sm text-ink">
              <span className="font-bold text-brown">Error:</span> {createError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={createMutation.isPending}>
              Create license type
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gold">All license types</h2>
        {toggleError ? (
          <p role="alert" className="text-sm text-ink border-2 border-brown rounded-md p-2 bg-white">
            <span className="font-bold text-brown">Could not change status:</span> {toggleError}
          </p>
        ) : null}
        {listQuery.isLoading ? (
          <LoadingState />
        ) : listQuery.isError ? (
          <ErrorState message={describeError(listQuery.error)} onRetry={() => listQuery.refetch()} />
        ) : !listQuery.data || listQuery.data.length === 0 ? (
          <EmptyState title="No license types yet" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-brown bg-white -mx-1 sm:mx-0 touch-pan-x">
            <table className="min-w-[640px] w-full text-sm text-ink">
              <thead className="bg-white text-xs uppercase tracking-wide text-brown border-b border-brown">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Label</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data.map((row) => (
                  <tr key={row.id} className="border-b border-brown last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-2">{row.label}</td>
                    <td className="px-4 py-2">
                      <AvailabilityBadge enabled={row.enabled} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.enabled ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs py-1.5 px-3"
                          isLoading={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ id: row.id, enabled: false })}
                        >
                          Disable for new apps
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          className="text-xs py-1.5 px-3"
                          isLoading={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ id: row.id, enabled: true })}
                        >
                          Enable
                        </Button>
                      )}
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
