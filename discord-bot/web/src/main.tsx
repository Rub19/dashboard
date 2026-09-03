import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { GuildProvider } from './context/GuildContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <GuildProvider>
        <App />
      </GuildProvider>
    </AuthProvider>
  </React.StrictMode>
);
