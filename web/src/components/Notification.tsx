// Este ficheiro deve estar em web/src/components/Notification.tsx
import { useEffect } from 'react';

type NotificationProps = {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
};

// Mapeia os tipos de notificação para classes de cor do Tailwind
// Fundo claro, borda e texto mais escuros
const typeClasses = {
  success: 'bg-green-100 border-green-400 text-green-800',
  error: 'bg-red-100 border-red-400 text-red-800',
  info: 'bg-sky-100 border-sky-400 text-sky-800',
};

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
}) => {
  useEffect(() => {
    // Fecha automaticamente após 6 segundos
    const timeout = setTimeout(() => onClose?.(), 6000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  // Usamos as classes do Tailwind que definimos
  return (
    <div
      className={`relative w-full rounded-lg border p-4 shadow-lg ${typeClasses[type]}`}
      role="alert"
    >
      <strong className="font-bold uppercase tracking-wide">
        {type === 'success' && 'Sucesso!'}
        {type === 'error' && 'Ocorreu um erro!'}
        {type === 'info' && 'Aviso:'}
      </strong>
      {/* Mensagem principal */}
      <p className="mt-2 block font-sans">{message}</p>
      
      {/* Botão de fechar (opcional) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-1 -right-1 p-2 text-2xl opacity-70 hover:opacity-100"
          aria-label="Fechar"
        >
          <span className="text-inherit">&times;</span>
        </button>
      )}
    </div>
  );
};

export default Notification;
