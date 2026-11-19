import { requireAuth } from '../../middleware/auth.js';
import { Router } from 'express';
import { searchController } from './search.controller.js';
export const searchRouter=Router();
searchRouter.get('/suggest',(req,res,next)=>searchController.suggest(req,res,next));
searchRouter.get('/recents',requireAuth,(req,res,next)=>searchController.recents(req,res,next));
searchRouter.post('/recents',requireAuth,(req,res,next)=>searchController.remember(req,res,next));
searchRouter.delete('/recents',requireAuth,(req,res,next)=>searchController.clearRecents(req,res,next));
