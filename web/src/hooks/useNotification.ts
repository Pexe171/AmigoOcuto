import { useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
  type: NotificationType;
  message: string;
};

export const createNotificationStore = () => {
  let current: Notification | null = null;

  return {
    show(type: NotificationType, message: string): Notification {
      current = { type, message };
      return current;
    },
    clear(): Notification | null {
      current = null;
      return current;
    },
    get(): Notification | null {
      return current;
    },
  };
};

export const useNotification = () => {
  const store = useState(() => createNotificationStore())[0];
  const [notification, setNotification] = useState<Notification | null>(store.get());

  const show = useCallback(
    (type: NotificationType, message: string) => {
      setNotification(store.show(type, message));
    },
    [store],
  );

  const clear = useCallback(() => setNotification(store.clear()), [store]);

  return { notification, show, clear };
};
