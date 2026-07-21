import { AppError } from "../../lib/errors.js";
import { usersRepository } from "./users.repository.js";
import type {
  RegisterUserInput,
  SetGenderInput,
  UpdateRoleInput,
} from "./users.schemas.js";

export class UsersService {
  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return user;
  }

  async register(input: RegisterUserInput) {
    const existing = await usersRepository.findByPhone(input.phone);
    if (existing) {
      throw new AppError(409, "Phone already registered", "PHONE_EXISTS");
    }
    return usersRepository.create(input);
  }

  async updateRole(userId: string, input: UpdateRoleInput) {
    const user = await usersRepository.updateRole(userId, input.role);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return user;
  }

  async verifyPhone(userId: string) {
    const user = await usersRepository.markPhoneVerified(userId);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return user;
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
    return user;
  }
}

export const usersService = new UsersService();
