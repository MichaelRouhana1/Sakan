import type { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.js";
import type {
  SetCampusInput,
  SetGenderInput,
  UpdateRoleInput,
  PushTokenInput,
  RemovePushTokenInput,
  NotificationPreferencesInput,
} from "./users.schemas.js";

export class UsersController {
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

  async syncIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.syncIdentityFromClerk(
        req.user!.id,
        req.user!.clerkId,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  }


  async notificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await usersService.notificationPreferences(req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await usersService.updateNotificationPreferences(
        req.user!.id,
        req.body as NotificationPreferencesInput,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async registerPushToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await usersService.registerPushToken(
        req.user!.id,
        req.body as PushTokenInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async removePushToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await usersService.removePushToken(
        req.user!.id,
        req.body as RemovePushTokenInput,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
