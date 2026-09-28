import { useEffect, useState } from "react";

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`bbdd:${key}`);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(`bbdd:${key}`, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
