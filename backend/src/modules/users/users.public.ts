/** Strip secrets / unused auth fields before returning user rows over the API. */
export function toPublicUser<
  T extends {
    passwordHash?: string | null;
    phoneVerifiedAt?: string | Date | null;
  },
>(user: T): Omit<T, "passwordHash" | "phoneVerifiedAt"> {
  const {
    passwordHash: _passwordHash,
    phoneVerifiedAt: _phoneVerifiedAt,
    ...rest
  } = user;
  return rest;
}
