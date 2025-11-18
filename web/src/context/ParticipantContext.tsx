import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { getCurrentParticipant, type ParticipantData } from '../services/api';

type ParticipantState = {
  id: string | null;
  firstName: string | null;
  isChild: boolean;
  contactEmail: string | null;
  token: string | null;
  giftListAuthToken: string | null;
};

type ParticipantContextValue = {
  participant: ParticipantState;
  setParticipant: Dispatch<SetStateAction<ParticipantState>>;
  clearParticipant: () => void;
  isReady: boolean;
};

const defaultState: ParticipantState = {
  id: null,
  firstName: null,
  isChild: false,
  contactEmail: null,
  token: null,
  giftListAuthToken: null,
};

const ParticipantContext = createContext<ParticipantContextValue | undefined>(undefined);

const STORAGE_KEY = 'amigoocuto.participant';

export const ParticipantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipantState] = useState<ParticipantState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<ParticipantState>;
        return {
          id: parsed.id ?? null,
          firstName: parsed.firstName ?? null,
          isChild: parsed.isChild ?? false,
          contactEmail: parsed.contactEmail ?? null,
          token: parsed.token ?? null,
          giftListAuthToken: parsed.giftListAuthToken ?? null,
        };
      } catch (error) {
        console.warn('Não foi possível restaurar o participante salvo', error);
      }
    }
    return defaultState;
  });
  const [isReady, setIsReady] = useState(false);

  // Tentar restaurar sessão via cookie no carregamento
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const participantData = await getCurrentParticipant();
        setParticipantState({
          id: participantData.id,
          firstName: participantData.firstName,
          isChild: participantData.isChild,
          contactEmail: participantData.contactEmail,
          token: null, // Token vem do cookie, não precisa armazenar no state
          giftListAuthToken: null,
        });
      } catch (error) {
        // Sessão inválida ou expirada, limpar localStorage
        localStorage.removeItem(STORAGE_KEY);
        console.warn('Não foi possível restaurar a sessão:', error);
      } finally {
        setIsReady(true);
      }
    };

    // Só tentar restaurar se não há dados no localStorage E não estamos na página de verificação ou inscrição
    const currentPath = window.location.pathname;
    const isVerificationPage = currentPath === '/confirmacao';
    const isRegistrationPage = currentPath === '/inscricao';

    if (!participant.id && !participant.token && !isVerificationPage && !isRegistrationPage) {
      restoreSession();
    } else {
      setIsReady(true);
    }
  }, []); // Executar apenas uma vez no mount

  useEffect(() => {
    if (participant.id && participant.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participant));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [participant]);

  const setParticipant = useCallback<Dispatch<SetStateAction<ParticipantState>>>(
    (next) => {
      setParticipantState(next);
    },
    []
  );
  const clearParticipant = useCallback((): void => {
    setParticipantState(() => ({ ...defaultState }));
  }, []);

  const value = useMemo(
    () => ({ participant, setParticipant, clearParticipant, isReady }),
    [participant, setParticipant, clearParticipant, isReady]
  );

  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>;
};

export const useParticipant = (): ParticipantContextValue => {
  const context = useContext(ParticipantContext);
  if (!context) {
    throw new Error('useParticipant deve ser utilizado dentro de ParticipantProvider');
  }
  return context;
};
