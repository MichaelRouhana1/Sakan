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
  const wallet = user as T & {boostCredits?:number;boostCreditUnitsVersion?:number};
  if(typeof wallet.boostCredits === "number" && wallet.boostCreditUnitsVersion === 1) Object.assign(rest,{boostCredits:wallet.boostCredits/100});
  return rest;
}
