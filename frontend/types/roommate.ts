export type SleepSchedule = "early" | "flexible" | "late";
export type SmokingPref = "no" | "outdoors" | "yes";
export type PetsPref = "no" | "yes";
export type MoveInTiming = "asap" | "this_month" | "flexible";
export type LookingCardStatus = "active" | "paused" | "withdrawn";
export type InviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired";

/** Browse teaser — never includes gender, phone, or photos. */
export type SeekerTeaser = {
  id: string;
  areas: string[];
  budgetMaxUsd: number;
  sleepSchedule: SleepSchedule;
  smoking: SmokingPref;
  pets: PetsPref;
  moveInTiming: MoveInTiming;
  status: LookingCardStatus;
  updatedAt: string;
};

export type LookingCard = SeekerTeaser & {
  contactPhone: string;
  photoUrls: string[];
  createdAt: string;
};

export type UnlockedSeeker = {
  id: string;
  areas: string[];
  budgetMaxUsd: number;
  sleepSchedule: SleepSchedule;
  smoking: SmokingPref;
  pets: PetsPref;
  moveInTiming: MoveInTiming;
  photoUrls: string[];
  whatsappPhone: string;
};

export type ListingPreview = {
  id: string;
  area: string;
  landmark: string | null;
  monthlyRentUsd: number;
  coverUrl: string | null;
  photoUrls: string[];
  whatsappPhone?: string | null;
};

export type RoommateInviteInboxItem = {
  id: string;
  status: InviteStatus;
  note: string;
  createdAt: string;
  listing: ListingPreview | null;
};

export type RoommateInviteSentItem = {
  id: string;
  status: InviteStatus;
  note: string;
  listingId: string;
  createdAt: string;
  seeker: SeekerTeaser | UnlockedSeeker | null;
};

export type UpsertLookingCardBody = {
  areas: string[];
  budgetMaxUsd: number;
  sleepSchedule: SleepSchedule;
  smoking: SmokingPref;
  pets: PetsPref;
  moveInTiming: MoveInTiming;
  contactPhone: string;
  photoUrls?: string[];
  status?: "active" | "paused";
};
