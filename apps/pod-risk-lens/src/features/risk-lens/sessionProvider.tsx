import {createContext, useContext, useSyncExternalStore, type ReactNode} from 'react';
import {RiskLensSession, type RiskLensSessionSnapshot} from './session';

const SessionContext = createContext<RiskLensSession | null>(null);

/** Presentation bridge; hosts choose when this session is created and disposed. */
export function RiskLensSessionProvider({session, children}: {session: RiskLensSession; children: ReactNode}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useRiskLensSessionInstance(): RiskLensSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('A Risk Lens session provider is required');
  return session;
}

export function useRiskLensSession(): RiskLensSessionSnapshot {
  const session = useRiskLensSessionInstance();
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}
