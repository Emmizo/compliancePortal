import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeConnectionProvider } from '@/contexts/RealtimeConnectionContext';
import { RealtimeSync } from '@/components/RealtimeSync';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 422) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root is missing in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RealtimeConnectionProvider>
          <AuthProvider>
            <RealtimeSync />
            <App />
          </AuthProvider>
        </RealtimeConnectionProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
