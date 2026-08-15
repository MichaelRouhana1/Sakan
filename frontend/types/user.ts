export type UserRole = "renter" | "poster";

export type UserAccountStatus = "active" | "restricted" | "banned";

export type UserGender = "male" | "female";

export type UserCampus = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  displayName: string;
  institutionName: string | null;
  institutionShortName: string | null;
  institutionSlug: string | null;
  logoUrl: string | null;
};

export type User = {
  id: string;
  phone: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  emailVerifiedAt?: string | null;
  campusId?: string | null;
  campus?: UserCampus | null;
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
