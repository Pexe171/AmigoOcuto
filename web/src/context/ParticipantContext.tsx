import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ParticipantState = {
  id: string | null;
  firstName: string | null;
  isChild: boolean;
  contactEmail: string | null;
  token: string | null;
};

type ParticipantContextValue = {
  participant: ParticipantState;
  setParticipant: (participant: ParticipantState) => void;
  clearParticipant: () => void;
};

const defaultState: ParticipantState = { id: null, firstName: null, isChild: false, contactEmail: null, token: null };

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
          token: parsed.token ?? null
        };
      } catch (error) {
        console.warn('Não foi possível restaurar o participante salvo', error);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    if (participant.id && participant.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participant));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [participant]);

  const setParticipant = (next: ParticipantState): void => setParticipantState(next);
  const clearParticipant = (): void => setParticipantState(defaultState);

  const value = useMemo(
    () => ({ participant, setParticipant, clearParticipant }),
    [participant]
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
