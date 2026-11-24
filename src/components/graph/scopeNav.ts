import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether the person asked for less motion. (P-83: Map's scope chains, once here, are retired.) */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduce(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}
