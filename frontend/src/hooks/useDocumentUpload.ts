import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { documentsApi, type UploadProgress } from '@/api/documents';
import { describeError } from '@/api/http';
import { validateDocument } from '@/lib/file-validation';
import type { DocumentMeta } from '@/types';

interface UseDocumentUploadResult {
  upload: (file: File) => Promise<DocumentMeta>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export function useDocumentUpload(applicationId: number): UseDocumentUploadResult {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const validation = validateDocument(file);
      if (!validation.ok) {
        throw new Error(validation.reason);
      }
      setError(null);
      setProgress({ loaded: 0, total: file.size, percent: 0 });
      return documentsApi.upload(applicationId, file, setProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications', applicationId] });
    },
    onError: (err: unknown) => {
      setError(describeError(err));
    },
  });

  return {
    upload: (file: File) => mutation.mutateAsync(file),
    progress,
    isUploading: mutation.isPending,
    error,
    reset: () => {
      setProgress(null);
      setError(null);
      mutation.reset();
    },
  };
}
