import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/Button';

export interface DocumentPreviewState {
  objectUrl: string;
  mimeType: string;
  filename: string;
  textContent?: string;
}

const OFFICE_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

interface DocumentPreviewModalProps {
  open: boolean;
  preview: DocumentPreviewState | null;
  onClose: () => void;
}

export function DocumentPreviewModal({ open, preview, onClose }: DocumentPreviewModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !preview) return null;

  const { objectUrl, mimeType, filename, textContent } = preview;
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');
  const isText = mimeType === 'text/plain' && textContent !== undefined;
  const isOffice = OFFICE_MIMES.has(mimeType);

  let body: ReactNode;
  if (isText) {
    body = (
      <pre className="text-xs text-ink whitespace-pre-wrap break-words p-3 bg-white border border-brown rounded max-h-[70vh] overflow-auto">
        {textContent}
      </pre>
    );
  } else if (isPdf && objectUrl) {
    body = (
      <iframe
        title={filename}
        src={objectUrl}
        className="w-full min-h-[70vh] border-0 bg-white rounded"
      />
    );
  } else if (isImage && objectUrl) {
    body = (
      <div className="flex justify-center overflow-auto max-h-[70vh] p-2">
        <img src={objectUrl} alt={filename} className="max-w-full h-auto object-contain" />
      </div>
    );
  } else if (isOffice) {
    body = (
      <p className="text-sm text-ink p-4">
        Word and Excel files cannot be previewed inside this portal. Use <strong>Download</strong> to open them
        on your computer.
      </p>
    );
  } else {
    body = (
      <p className="text-sm text-ink p-4">
        No preview is available for this file type (<span className="font-mono text-xs">{mimeType}</span>). Use{' '}
        <strong>Download</strong> to open the file.
      </p>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex flex-col w-full max-w-5xl max-h-[90vh] bg-white border-2 border-brown rounded-lg shadow-lg overflow-hidden outline-none"
      >
        <div className="flex items-start justify-between gap-2 px-3 py-2 sm:px-4 border-b border-brown bg-white shrink-0">
          <h2 id="document-preview-title" className="text-sm font-semibold text-gold break-all min-w-0 pr-2">
            {filename}
          </h2>
          <Button type="button" variant="secondary" className="text-xs shrink-0" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto bg-white p-2 sm:p-3">{body}</div>
      </div>
    </div>
  );
}
