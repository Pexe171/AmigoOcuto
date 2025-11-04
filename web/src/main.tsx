// Este ficheiro deve estar em web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App, { ParticipantProvider } from './App'; // Importamos o App e o Provider
import './styles/index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ParticipantProvider>
        {/* Removemos o <BrowserRouter> */}
        <App />
      </ParticipantProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
