import axios, { type AxiosError } from 'axios';
import { http, describeError } from './http';
import type { DocumentMeta } from '@/types';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

async function messageFromBlobError(err: AxiosError): Promise<string | null> {
  const responseBlob = err.response?.data;
  if (!(responseBlob instanceof Blob)) {
    return null;
  }
  const text = await responseBlob.text();
  try {
    const envelope = JSON.parse(text) as { message?: string };
    return envelope.message ?? text;
  } catch {
    return text || null;
  }
}

export const documentsApi = {
  async list(applicationId: number): Promise<DocumentMeta[]> {
    return (await http.get<DocumentMeta[]>(`/applications/${applicationId}/documents`)).data;
  },
  async upload(
    applicationId: number,
    file: File,
    onProgress?: (p: UploadProgress) => void,
  ): Promise<DocumentMeta> {
    const form = new FormData();
    form.append('file', file);
    return (
      await http.post<DocumentMeta>(`/applications/${applicationId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!onProgress) return;
          const total = evt.total ?? file.size;
          const loaded = evt.loaded ?? 0;
          onProgress({
            loaded,
            total,
            percent: total === 0 ? 0 : Math.round((loaded / total) * 100),
          });
        },
      })
    ).data;
  },

  async fetchFile(applicationId: number, documentId: number, attachment: boolean): Promise<Blob> {
    try {
      return (
        await http.get<Blob>(`/applications/${applicationId}/documents/${documentId}/file`, {
          responseType: 'blob',
          params: { attachment: attachment ? 'true' : 'false' },
        })
      ).data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
        const parsed = await messageFromBlobError(e);
        throw new Error(parsed ?? describeError(e));
      }
      throw e;
    }
  },
};
