import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const ReduceMotionContext = createContext<boolean | null>(null);

// One listener serves all motion in the app and honors changes made in Settings.
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduced(value); })
      .catch(() => { if (mounted) setReduced(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return <ReduceMotionContext.Provider value={reduced}>{children}</ReduceMotionContext.Provider>;
}

export function useReduceMotion() { return useContext(ReduceMotionContext); }
