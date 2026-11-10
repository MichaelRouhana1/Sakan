import type { Map as MapboxMap } from "mapbox-gl";

type CameraStep = (eventData: Record<string, unknown>) => void;
export type WebCameraIntent = {
  isCurrent: () => boolean;
  after: (delayMs: number, task: () => void) => void;
  run: (steps: CameraStep[]) => void;
  cancel: () => void;
};

/** Owns authored camera work, not Mapbox's gesture handlers or selection state. */
export class WebMapCamera {
  private serial = 0;
  private current: { id: number; kind: string; running: boolean; cleanups: Set<() => void>; settled?: () => void } | null = null;
  private disposed = false;

  constructor(private map: MapboxMap) {
    const host = map.getContainer();
    for (const type of ["pointerdown", "mousedown", "touchstart", "wheel", "keydown"]) {
      host.addEventListener(type, this.onInput, { capture: true, passive: true });
    }
    map.on("movestart", this.onUserMove);
  }

  private onInput = (event: Event): void => {
    const target = event.target as Element | null;
    if (target?.closest?.(".studently-amber-popup-card")) return;
    if (event.type === "keydown" && ["Tab", "Shift", "Control", "Alt", "Meta"].includes((event as KeyboardEvent).key)) return;
    this.cancel();
  };

  private onUserMove = (event: { originalEvent?: unknown }): void => {
    if (event.originalEvent) this.cancel(false);
  };

  cancel(stop = true): void {
    const previous = this.current;
    if (!previous) return;
    // Invalidate and detach BEFORE stop(), which fires moveend synchronously.
    this.current = null;
    for (const cleanup of previous.cleanups) cleanup();
    previous.cleanups.clear();
    if (stop && previous.running) this.map.stop();
    if (!this.disposed) previous.settled?.();
  }

  cancelKinds(...kinds: string[]): void {
    if (this.current && kinds.includes(this.current.kind)) this.cancel();
  }

  begin(kind: string, settled?: () => void): WebCameraIntent {
    this.cancel();
    const session = { id: ++this.serial, kind, running: false, cleanups: new Set<() => void>(), settled };
    if (!this.disposed) this.current = session;
    const isCurrent = () => !this.disposed && this.current === session;
    const finish = () => { if (isCurrent()) this.cancel(false); };
    const after = (delayMs: number, task: () => void) => {
      if (!isCurrent()) return;
      const timer = setTimeout(() => {
        session.cleanups.delete(clear);
        if (isCurrent()) task();
      }, delayMs);
      const clear = () => clearTimeout(timer);
      session.cleanups.add(clear);
    };
    const run = (steps: CameraStep[]) => {
      if (!isCurrent()) return;
      let index = 0;
      const next = () => {
        if (!isCurrent()) return;
        if (index === steps.length) { finish(); return; }
        const stage = index;
        const onEnd = (event: { type: string; studentlyCameraIntent?: number; studentlyCameraStage?: number }) => {
          if (event.studentlyCameraIntent !== session.id || event.studentlyCameraStage !== stage || !isCurrent()) return;
          clear();
          session.cleanups.delete(clear);
          next();
        };
        const clear = () => this.map.off("moveend", onEnd);
        session.cleanups.add(clear);
        this.map.on("moveend", onEnd);
        session.running = true;
        try { steps[index++]({ studentlyCameraIntent: session.id, studentlyCameraStage: stage, studentlyCameraKind: kind }); }
        catch { finish(); }
      };
      // Bound active SDK no-ops. Merely awaiting data is not an expired intent:
      // a slow reply remains valid until another request/input cancels it.
      after(5_000, () => this.cancel());
      next();
    };
    return { isCurrent, after, run, cancel: () => { if (isCurrent()) this.cancel(); } };
  }

  destroy(): void {
    this.disposed = true;
    this.cancel();
    const host = this.map.getContainer();
    for (const type of ["pointerdown", "mousedown", "touchstart", "wheel", "keydown"]) host.removeEventListener(type, this.onInput, true);
    this.map.off("movestart", this.onUserMove);
  }
}
