/** Strip secrets before returning user rows over the API. */
export function toPublicUser<T extends { passwordHash?: string | null }>(
  user: T,
): Omit<T, "passwordHash"> {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}
