export type UserRole = "renter" | "poster";

export type UserAccountStatus = "active" | "restricted" | "banned";

export type User = {
  id: string;
  phone: string;
  role: UserRole;
  postCredits: number;
  boostCredits: number;
  freeCreditClaimed: boolean;
  accountStatus: UserAccountStatus;
  createdAt: string;
  updatedAt: string;
};
