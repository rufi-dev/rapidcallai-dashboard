import { createContext, useContext, useMemo, useState } from "react";

type HeaderState = {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

type HeaderCtx = {
  header: HeaderState;
  setHeader: (h: HeaderState) => void;
  clearHeader: () => void;
};

const Ctx = createContext<HeaderCtx | null>(null);

export function HeaderSlotProvider(props: React.PropsWithChildren) {
  const [header, setHeaderState] = useState<HeaderState>({});

  const value = useMemo<HeaderCtx>(
    () => ({
      header,
      setHeader: (h) => setHeaderState(h),
      clearHeader: () => setHeaderState({}),
    }),
    [header]
  );

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useHeaderSlots() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHeaderSlots must be used within HeaderSlotProvider");
  return v;
}


