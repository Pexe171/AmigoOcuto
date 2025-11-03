import { useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
  type: NotificationType;
  message: string;
};

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const show = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message });
  }, []);

  const clear = useCallback(() => setNotification(null), []);

  return { notification, show, clear };
};
