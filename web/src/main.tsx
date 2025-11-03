import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { ParticipantProvider } from './context/ParticipantContext';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ParticipantProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ParticipantProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
