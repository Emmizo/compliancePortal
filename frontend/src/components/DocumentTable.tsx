import { useState } from 'react';
import { documentsApi } from '@/api/documents';
import { describeError } from '@/api/http';
import { Button } from '@/components/Button';
import { DocumentPreviewModal, type DocumentPreviewState } from '@/components/DocumentPreviewModal';
import { EmptyState } from '@/components/EmptyState';
import { formatBytes } from '@/lib/file-validation';
import type { DocumentMeta } from '@/types';

const OFFICE_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

interface DocumentTableProps {
  applicationId: number;
  documents: readonly DocumentMeta[];
  emptyDescription?: string;
}

export function DocumentTable({ applicationId, documents, emptyDescription }: DocumentTableProps) {
  const noDocsDescription =
    emptyDescription ?? 'Use the upload form above to attach supporting documentation.';

  const [busy, setBusy] = useState<{ docId: number; op: 'view' | 'download' } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<DocumentPreviewState | null>(null);

  if (documents.length === 0) {
    return (
      <EmptyState title="No documents uploaded yet" description={noDocsDescription} />
    );
  }

  function closePreview() {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
    setPreviewOpen(false);
  }

  async function handleView(doc: DocumentMeta) {
    setActionError(null);
    setBusy({ docId: doc.id, op: 'view' });
    try {
      closePreview();
      const blob = await documentsApi.fetchFile(applicationId, doc.id, false);
      const mime =
        blob.type && blob.type !== 'application/octet-stream' ? blob.type : doc.mimeType;

      if (mime === 'text/plain') {
        const text = await blob.text();
        setPreview({ objectUrl: '', mimeType: mime, filename: doc.originalFilename, textContent: text });
        setPreviewOpen(true);
        return;
      }

      if (OFFICE_MIMES.has(mime)) {
        setPreview({ objectUrl: '', mimeType: mime, filename: doc.originalFilename });
        setPreviewOpen(true);
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreview({ objectUrl: url, mimeType: mime, filename: doc.originalFilename });
      setPreviewOpen(true);
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(doc: DocumentMeta) {
    setActionError(null);
    setBusy({ docId: doc.id, op: 'download' });
    try {
      const blob = await documentsApi.fetchFile(applicationId, doc.id, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      a.rel = 'noopener';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...documents].sort((a, b) => {
    if (b.versionNumber !== a.versionNumber) return b.versionNumber - a.versionNumber;
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  return (
    <div className="space-y-2">
      <DocumentPreviewModal open={previewOpen} preview={preview} onClose={closePreview} />
      {actionError ? (
        <p role="alert" className="text-sm text-ink border-2 border-brown rounded-md p-2 bg-white">
          <span className="font-bold text-brown">Error:</span> {actionError}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-brown bg-white -mx-1 sm:mx-0 touch-pan-x">
        <table className="min-w-[720px] w-full text-sm text-ink">
          <thead className="bg-white text-xs uppercase tracking-wide text-brown border-b border-brown">
            <tr>
              <th className="px-3 py-2 text-left">File</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">Uploaded</th>
              <th className="px-3 py-2 text-left">Version</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((doc) => (
              <tr key={doc.id} className="border-t border-brown">
                <td className="px-3 py-2 font-semibold text-ink break-words max-w-[14rem]">
                  {doc.originalFilename}
                </td>
                <td className="px-3 py-2 text-ink">{doc.mimeType}</td>
                <td className="px-3 py-2 text-ink">{formatBytes(doc.sizeBytes)}</td>
                <td className="px-3 py-2 text-ink whitespace-nowrap">
                  {new Date(doc.uploadedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-full bg-gold text-white px-2 py-0.5 text-xs font-semibold">
                    v{doc.versionNumber}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs py-1.5 px-2"
                      disabled={busy !== null}
                      isLoading={busy?.docId === doc.id && busy.op === 'view'}
                      onClick={() => void handleView(doc)}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs py-1.5 px-2"
                      disabled={busy !== null}
                      isLoading={busy?.docId === doc.id && busy.op === 'download'}
                      onClick={() => void handleDownload(doc)}
                    >
                      Download
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
