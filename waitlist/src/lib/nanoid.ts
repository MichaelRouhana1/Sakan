/** Tiny custom alphabet generator (no extra dependency). */
export function customAlphabet(alphabet: string, size: number) {
  return function generate(): string {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    let id = "";
    for (let i = 0; i < size; i += 1) {
      id += alphabet[bytes[i]! % alphabet.length];
    }
    return id;
  };
}
