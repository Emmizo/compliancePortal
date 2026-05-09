import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { applicationsApi } from '@/api/applications';
import { licenseTypesApi } from '@/api/licenseTypes';
import { describeError } from '@/api/http';
import { Button } from '@/components/Button';
import { TextAreaField, TextField } from '@/components/FormField';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { createApplicationSchema, type CreateApplicationInput } from '@/lib/schemas';

const SELECT_CLASSES =
  'block w-full rounded-md border border-brown bg-white text-ink px-3 py-2 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold';

export function ApplicationNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ['license-types'],
    queryFn: () => licenseTypesApi.listActive(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { institutionName: '', licenseType: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      applicationsApi.create({
        institutionName: input.institutionName,
        licenseType: input.licenseType,
        description: input.description ? input.description : undefined,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      navigate(`/applications/${created.id}`);
    },
    onError: (err) => setServerError(describeError(err)),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">Start a new application</h1>
        <p className="text-sm text-ink max-w-prose">
          This page only creates the draft record (no file upload here). Click <strong>Create draft</strong> when
          ready—you will be taken to your new application&apos;s page. On that page, scroll to the{' '}
          <strong>Documents</strong> section and use <strong>Upload a document</strong> (you can add files while
          the status is draft, or again after a reviewer asks for more information). Then use{' '}
          <strong>Actions</strong> to submit when you are ready for review.
        </p>
      </header>

      {typesQuery.isLoading ? (
        <LoadingState />
      ) : typesQuery.isError ? (
        <ErrorState message={describeError(typesQuery.error)} onRetry={() => typesQuery.refetch()} />
      ) : !typesQuery.data?.length ? (
        <EmptyState
          title="No license types available"
          description="An administrator must add license categories before new applications can be started."
        />
      ) : (
        <form
          onSubmit={handleSubmit((values) => {
            setServerError(null);
            mutation.mutate(values);
          })}
          className="bg-white border border-brown rounded-lg p-4 sm:p-6 space-y-4"
          noValidate
        >
          <TextField
            label="Institution name"
            hint="The legal name of the institution applying for this licence, as it should appear on the record."
            {...register('institutionName')}
            error={errors.institutionName?.message}
          />
          <label className="block text-sm">
            <span className="text-ink font-semibold">License type</span>
            <select {...register('licenseType')} className={SELECT_CLASSES + ' mt-1'}>
              <option value="">Select a license type…</option>
              {typesQuery.data.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.label} ({t.code})
                </option>
              ))}
            </select>
            {errors.licenseType ? (
              <p role="alert" className="mt-1 text-brown text-xs font-bold">
                Error: {errors.licenseType.message}
              </p>
            ) : (
              <p className="mt-1 text-ink text-xs">Types are managed by portal administrators.</p>
            )}
          </label>
          <TextAreaField
            label="Description"
            hint="Optional. Summarise the nature of the business and anything reviewers should know early. You can add more detail later."
            {...register('description')}
            error={errors.description?.message}
          />

          {serverError ? (
            <p role="alert" className="text-sm text-ink bg-white border-2 border-brown rounded p-2">
              <span className="font-bold text-brown">Error:</span> {serverError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" isLoading={mutation.isPending}>
              Create draft
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
