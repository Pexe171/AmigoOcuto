// Este ficheiro deve estar em web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ParticipantProvider } from './context/ParticipantContext';
import './styles/index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ParticipantProvider>
        <App />
      </ParticipantProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
