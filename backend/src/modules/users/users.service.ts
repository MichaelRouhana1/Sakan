import { AppError } from "../../lib/errors.js";
import { usersRepository } from "./users.repository.js";
import type { RegisterUserInput } from "./users.schemas.js";

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
}

export const usersService = new UsersService();
