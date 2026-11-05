import { createContext, useContext, type ReactNode } from 'react';
import type { Viewer } from '@/lib/gql';

const ViewerContext = createContext<Viewer | null>(null);

export const ViewerProvider = ({ viewer, children }: { viewer: Viewer; children: ReactNode }) => (
  <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
);

export function useViewer(): Viewer {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error('useViewer must be used inside a signed-in session');
  return viewer;
}
