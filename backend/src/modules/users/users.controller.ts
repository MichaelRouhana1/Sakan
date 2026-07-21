import type { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.js";
import type {
  RegisterUserInput,
  SetGenderInput,
  UpdateRoleInput,
} from "./users.schemas.js";

export class UsersController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.register(req.body as RegisterUserInput);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getById(req.user!.id);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.updateRole(
        req.user!.id,
        req.body as UpdateRoleInput,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }

  async verifyPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.verifyPhone(req.user!.id);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }

  async setGender(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.setGender(
        req.user!.id,
        req.body as SetGenderInput,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
