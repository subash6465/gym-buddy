import { useSyncExternalStore } from 'react';

// Server and browser snapshots differ without an extra render effect.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(() => () => {}, () => client, () => server);
}
