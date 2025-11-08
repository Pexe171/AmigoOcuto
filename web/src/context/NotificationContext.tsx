// Este ficheiro deve estar em web/src/context/NotificationContext.tsx
import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import NotificationComponent from '../components/Notification';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
  type: NotificationType;
  message: string;
};

type NotificationContextType = {
  showNotification: (message: string, type: NotificationType) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <div className="fixed top-5 right-5 z-50 w-full max-w-sm">
          <NotificationComponent
            type={notification.type}
            message={notification.message}
            onClose={clearNotification}
          />
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
