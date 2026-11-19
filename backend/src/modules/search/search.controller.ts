import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../lib/errors.js';
import { searchRecentSchema, searchSuggestQuerySchema } from './search.schemas.js';
import { searchService } from './search.service.js';

import { searchRecentsService } from './search-recents.service.js';

export class SearchController {
  async recents(req: Request,res: Response,next: NextFunction) {
    try {res.setHeader('Cache-Control','private, no-store');res.json({data:await searchRecentsService.list(req.user!.id)});}
    catch(error) {next(error);}
  }
  async remember(req: Request,res: Response,next: NextFunction) {
    try {
      const parsed=searchRecentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Choose a valid search destination');
      res.setHeader('Cache-Control','private, no-store');
      res.json({data:await searchRecentsService.remember(req.user!.id,parsed.data)});
    } catch(error) {next(error);}
  }
  async clearRecents(req: Request,res: Response,next: NextFunction) {
    try {await searchRecentsService.clear(req.user!.id);res.setHeader('Cache-Control','private, no-store');res.status(204).end();}
    catch(error) {next(error);}
  }
  async suggest(req: Request,res: Response,next: NextFunction) {
    try {
      const parsed=searchSuggestQuerySchema.safeParse({q:req.query.q ?? '',limit:req.query.limit});
      if(!parsed.success) throw new ValidationError(parsed.error.issues.map(i=>i.message).join('; '));
      res.setHeader('Cache-Control','no-store');
      res.json({data:await searchService.suggest(parsed.data.q,parsed.data.limit)});
    } catch(error) { next(error); }
  }
}
export const searchController=new SearchController();
