import { useEffect } from 'react';

type NotificationProps = {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
};

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timeout = setTimeout(() => onClose?.(), 6000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className={`alert ${type}`}>
      <strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>{type}</strong>
      <p style={{ margin: '8px 0 0' }}>{message}</p>
    </div>
  );
};

export default Notification;
