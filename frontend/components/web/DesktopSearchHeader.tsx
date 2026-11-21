import type { ReactNode } from 'react';
/** Native fallback: desktop chrome never adds a native surface. */
export function DesktopSearchHeader({children}: {children: ReactNode; home?: boolean; visible?: boolean}) { return <>{children}</>; }
export function FloatingDesktopScaleControl() { return null; }
