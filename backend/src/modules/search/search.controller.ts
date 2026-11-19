import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../lib/errors.js';
import { searchSuggestQuerySchema } from './search.schemas.js';
import { searchService } from './search.service.js';

export class SearchController {
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
