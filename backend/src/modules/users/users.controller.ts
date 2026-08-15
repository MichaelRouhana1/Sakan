import type { Request, Response, NextFunction } from "express";
import { registrationService } from "./registration.service.js";
import { usersService } from "./users.service.js";
import type {
  CompleteRegistrationInput,
  LoginWithPasswordInput,
  RegisterUserInput,
  RequestRegistrationCodeInput,
  SetCampusInput,
  SetGenderInput,
  SyncClerkUserInput,
  UpdateRoleInput,
  VerifyRegistrationCodeInput,
} from "./users.schemas.js";

export class UsersController {
  async syncClerkUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.syncClerkUser(
        req.body as SyncClerkUserInput,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.register(req.body as RegisterUserInput);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  }

  async requestRegistrationCode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await registrationService.requestCode(
        req.body as RequestRegistrationCodeInput,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async verifyRegistrationCode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await registrationService.verifyCode(
        req.body as VerifyRegistrationCodeInput,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async completeRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await registrationService.complete(
        req.body as CompleteRegistrationInput,
      );
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await registrationService.login(
        req.body as LoginWithPasswordInput,
      );
      res.json({ data: user });
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

  async setCampus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.setCampus(
        req.user!.id,
        req.body as SetCampusInput,
      );
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
