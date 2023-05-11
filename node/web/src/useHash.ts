import { useCallback, useEffect, useState } from "react";

export function useHash() {
  const [hashState, setHashState] = useState(window.location.hash);

  const setHash = useCallback((newHash: string) => {
    window.location.hash = newHash;
  }, []);

  useEffect(() => {
    const onHashChange = (e: HashChangeEvent) => {
      setHashState(new URL(e.newURL).hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  return [hashState, setHash] as const;
}
