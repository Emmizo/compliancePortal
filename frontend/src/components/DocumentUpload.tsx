import { useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { ACCEPT_ATTRIBUTE, formatBytes, validateDocument } from '@/lib/file-validation';

interface DocumentUploadProps {
  applicationId: number;
}

export function DocumentUpload({ applicationId }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const { upload, progress, isUploading, error: serverError, reset } = useDocumentUpload(applicationId);

  function onPick(file: File | undefined) {
    setClientError(null);
    reset();
    if (!file) return;
    const validation = validateDocument(file);
    if (!validation.ok) {
      setClientError(validation.reason);
      return;
    }
    upload(file).catch(() => {});
  }

  return (
    <div className="rounded-md border border-brown bg-white p-4 space-y-3">
      <header>
        <h3 className="font-semibold text-gold">Upload a document</h3>
        <p className="text-sm text-ink">
          Accepted formats: PDF, Word, Excel, PNG, JPG, plain text. Maximum size 5 MB per file. Uploaded files are
          kept with this application and an entry is written to the audit log.
        </p>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="block text-sm text-ink"
        onChange={(e) => onPick(e.target.files?.[0])}
        disabled={isUploading}
        data-testid="document-file-input"
      />

      {progress && isUploading ? (
        <div className="text-sm text-ink">
          <p>
            Uploading... {progress.percent}% ({formatBytes(progress.loaded)} of{' '}
            {formatBytes(progress.total)})
          </p>
          <div className="mt-1 h-2 w-full bg-white border border-brown rounded">
            <div
              className="h-2 bg-gold rounded"
              style={{ width: `${progress.percent}%` }}
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
        </div>
      ) : null}

      {clientError ? (
        <p role="alert" className="text-sm text-ink">
          <span className="font-bold text-brown">Error:</span> {clientError}
        </p>
      ) : null}
      {serverError ? (
        <p role="alert" className="text-sm text-ink">
          <span className="font-bold text-brown">Error:</span> {serverError}
        </p>
      ) : null}

      {!isUploading && (clientError || serverError) ? (
        <Button
          variant="secondary"
          onClick={() => {
            setClientError(null);
            reset();
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          Choose another file
        </Button>
      ) : null}
    </div>
  );
}
