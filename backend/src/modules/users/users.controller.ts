import type { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.js";
import type { RegisterUserInput } from "./users.schemas.js";

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
}

export const usersController = new UsersController();
