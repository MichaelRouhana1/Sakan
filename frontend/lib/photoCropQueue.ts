import type { CropRect, DecodedPhoto, PhotoSource } from "./photoCropGeometry";
export type CropQueueState = {
  phase: "idle" | "picking" | "loading" | "cropping" | "saving";
  current?: DecodedPhoto;
  position: number;
  total: number;
  notices: string[];
  error?: string;
};
type Dependencies = {
  capacity: () => number;
  decode: (source: PhotoSource) => Promise<DecodedPhoto>;
  exportCrop: (source: DecodedPhoto, rect: CropRect) => Promise<string>;
  commit: (uri: string) => void;
  release: (source: PhotoSource) => void;
  changed: (state: CropQueueState) => void;
};
/** One owner for picker, FIFO decoding and crop export. Generation guards invalidate late work. */
export class PhotoCropQueue {
  state: CropQueueState = { phase: "idle", position: 0, total: 0, notices: [] };
  private generation = 0;
  private sources: PhotoSource[] = [];
  private deps: Dependencies;
  constructor(deps: Dependencies) {
    this.deps = deps;
  }
  private update(patch: Partial<CropQueueState>) {
    this.state = { ...this.state, ...patch };
    this.deps.changed(this.state);
  }
  beginPick() {
    if (this.state.phase !== "idle" || this.deps.capacity() <= 0) return null;
    const token = ++this.generation;
    this.update({ phase: "picking", notices: [], error: undefined });
    return token;
  }
  async admit(sources: PhotoSource[], token = this.beginPick()) {
    if (
      token === null ||
      token !== this.generation ||
      this.state.phase !== "picking"
    ) {
      sources.forEach(this.deps.release);
      if (
        this.state.phase === "idle" &&
        this.deps.capacity() <= 0 &&
        sources.length
      )
        this.update({
          notices: [
            `${sources.length} photo${sources.length === 1 ? " was" : "s were"} skipped: all 15 slots are in use.`,
          ],
        });
      return;
    }
    const capacity = Math.max(0, this.deps.capacity());
    this.sources = sources.slice(0, capacity);
    sources.slice(capacity).forEach(this.deps.release);
    const skipped = sources.length - this.sources.length;
    this.update({
      total: this.sources.length,
      position: 0,
      notices: skipped
        ? [
            `${skipped} photo${skipped === 1 ? " was" : "s were"} skipped: only ${capacity} slots remained (15 maximum).`,
          ]
        : [],
    });
    await this.advance(token);
  }
  pickerFailed(token: number, message?: string) {
    if (token !== this.generation) return;
    this.finish();
    if (message) this.update({ notices: [message] });
  }
  private async advance(token: number) {
    while (token === this.generation) {
      const source = this.sources.shift();
      if (!source) {
        this.update({ phase: "idle", current: undefined, error: undefined });
        return;
      }
      this.update({
        phase: "loading",
        current: undefined,
        position: this.state.position + 1,
        error: undefined,
      });
      try {
        const decoded = await this.deps.decode(source);
        if (decoded.uri !== source.uri) this.deps.release(source);
        if (token !== this.generation) {
          this.deps.release(decoded);
          return;
        }
        this.update({ phase: "cropping", current: decoded });
        return;
      } catch {
        this.deps.release(source);
        if (token !== this.generation) return;
        this.update({
          notices: [
            ...this.state.notices,
            `${source.name}: couldn't read this image. Skipped.`,
          ],
        });
      }
    }
  }
  async save(rect: CropRect) {
    const current = this.state.current;
    if (!current || this.state.phase !== "cropping") return;
    const token = this.generation;
    this.update({ phase: "saving", error: undefined });
    try {
      const uri = await this.deps.exportCrop(current, rect);
      if (token !== this.generation) {
        this.deps.release({ uri, name: "crop", owned: true });
        this.deps.release(current);
        return;
      }
      this.deps.commit(uri);
      this.deps.release(current);
      await this.advance(token);
    } catch {
      if (token === this.generation)
        this.update({
          phase: "cropping",
          error: "Couldn't save this crop. Try again or discard this photo.",
        });
      else this.deps.release(current);
    }
  }
  discard() {
    if (this.state.phase !== "cropping") return;
    if (this.state.current) this.deps.release(this.state.current);
    void this.advance(this.generation);
  }
  finish() {
    ++this.generation;
    this.sources.forEach(this.deps.release);
    this.sources = [];
    // A pending export still owns its decoded source until it settles.
    if (this.state.current && this.state.phase !== "saving")
      this.deps.release(this.state.current);
    this.update({ phase: "idle", current: undefined, error: undefined });
  }
}
