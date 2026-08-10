import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WebShellChromeValue = {
  /** Drop max-width / footer for map split browse. */
  fullBleed: boolean;
  setFullBleed: (value: boolean) => void;
  /** Hide page footer (map mode). */
  hideFooter: boolean;
  setHideFooter: (value: boolean) => void;
  /** Freeze shell to the viewport for map split (list column scrolls). */
  lockScroll: boolean;
  setLockScroll: (value: boolean) => void;
};

const WebShellChromeContext = createContext<WebShellChromeValue | null>(null);

export function WebShellChromeProvider({ children }: { children: ReactNode }) {
  const [fullBleed, setFullBleedState] = useState(false);
  const [hideFooter, setHideFooterState] = useState(false);
  const [lockScroll, setLockScrollState] = useState(false);

  const setFullBleed = useCallback((value: boolean) => {
    setFullBleedState(value);
  }, []);

  const setHideFooter = useCallback((value: boolean) => {
    setHideFooterState(value);
  }, []);

  const setLockScroll = useCallback((value: boolean) => {
    setLockScrollState(value);
  }, []);

  const value = useMemo(
    () => ({
      fullBleed,
      setFullBleed,
      hideFooter,
      setHideFooter,
      lockScroll,
      setLockScroll,
    }),
    [
      fullBleed,
      hideFooter,
      lockScroll,
      setFullBleed,
      setHideFooter,
      setLockScroll,
    ],
  );

  return (
    <WebShellChromeContext.Provider value={value}>
      {children}
    </WebShellChromeContext.Provider>
  );
}

export function useWebShellChrome(): WebShellChromeValue {
  const ctx = useContext(WebShellChromeContext);
  if (!ctx) {
    return {
      fullBleed: false,
      setFullBleed: () => undefined,
      hideFooter: false,
      setHideFooter: () => undefined,
      lockScroll: false,
      setLockScroll: () => undefined,
    };
  }
  return ctx;
}
