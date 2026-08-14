import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type RenterTabChromeValue = {
  tabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
};

const RenterTabChromeContext = createContext<RenterTabChromeValue | null>(
  null,
);

export function RenterTabChromeProvider({ children }: { children: ReactNode }) {
  const [tabBarHidden, setTabBarHiddenState] = useState(false);
  const setTabBarHidden = useCallback((hidden: boolean) => {
    setTabBarHiddenState(hidden);
  }, []);
  const value = useMemo(
    () => ({ tabBarHidden, setTabBarHidden }),
    [tabBarHidden, setTabBarHidden],
  );
  return (
    <RenterTabChromeContext.Provider value={value}>
      {children}
    </RenterTabChromeContext.Provider>
  );
}

export function useRenterTabChrome(): RenterTabChromeValue {
  const ctx = useContext(RenterTabChromeContext);
  if (!ctx) {
    return { tabBarHidden: false, setTabBarHidden: () => undefined };
  }
  return ctx;
}
