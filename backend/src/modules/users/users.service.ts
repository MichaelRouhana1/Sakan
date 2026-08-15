import { AppError } from "../../lib/errors.js";
import { universitiesRepository } from "../universities/universities.repository.js";
import { universitiesService } from "../universities/universities.service.js";
import { toPublicUser } from "./users.public.js";
import { usersRepository } from "./users.repository.js";
import type {
  RegisterUserInput,
  SetCampusInput,
  SetGenderInput,
  SyncClerkUserInput,
  UpdateRoleInput,
} from "./users.schemas.js";

export class UsersService {
  async withCampus<T extends { campusId?: string | null }>(user: T) {
    if (!user.campusId) return { ...user, campus: null };
    const campus = await universitiesRepository.findById(user.campusId);
    return { ...user, campus: campus?.active ? campus : null };
  }

  async syncClerkUser(input: SyncClerkUserInput) {
    const user = await usersRepository.syncClerkUser(input);
    return this.withCampus(toPublicUser(user));
  }
  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return this.withCampus(toPublicUser(user));
  }

  async register(input: RegisterUserInput) {
    const existing = await usersRepository.findByPhone(input.phone);
    if (existing) {
      throw new AppError(409, "Phone already registered", "PHONE_EXISTS");
    }
    const user = await usersRepository.create(input);
    return this.withCampus(toPublicUser(user));
  }

  async setCampus(userId: string, input: SetCampusInput) {
    const campus = await universitiesService.requireActiveCampus(input.campusId);
    const user = await usersRepository.setCampus(userId, campus.id);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return this.withCampus(toPublicUser(user));
  }

  async updateRole(userId: string, input: UpdateRoleInput) {
    const user = await usersRepository.updateRole(userId, input.role);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return this.withCampus(toPublicUser(user));
  }

  async verifyPhone(userId: string) {
    const user = await usersRepository.markPhoneVerified(userId);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return this.withCampus(toPublicUser(user));
  }

  async setGender(userId: string, input: SetGenderInput) {
    const existing = await usersRepository.findById(userId);
    if (!existing) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    if (existing.gender && existing.gender !== input.gender) {
      throw new AppError(
        409,
        "Gender already set and cannot be changed",
        "GENDER_LOCKED",
      );
    }
    const user = await usersRepository.setGender(userId, input.gender);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return this.withCampus(toPublicUser(user));
  }
}

export const usersService = new UsersService();
