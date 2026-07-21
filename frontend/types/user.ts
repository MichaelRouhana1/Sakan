export type UserRole = "renter" | "poster";

export type UserAccountStatus = "active" | "restricted" | "banned";

export type UserGender = "male" | "female";

export type User = {
  id: string;
  phone: string;
  role: UserRole;
  postCredits: number;
  boostCredits: number;
  freeCreditClaimed: boolean;
  accountStatus: UserAccountStatus;
  phoneVerifiedAt: string | null;
  gender: UserGender | null;
  createdAt: string;
  updatedAt: string;
};
