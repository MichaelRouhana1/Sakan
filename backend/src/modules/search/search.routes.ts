import { Router } from 'express';
import { searchController } from './search.controller.js';
export const searchRouter=Router();
searchRouter.get('/suggest',(req,res,next)=>searchController.suggest(req,res,next));
