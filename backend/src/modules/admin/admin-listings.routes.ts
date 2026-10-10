import { Router } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors.js';
import { adminInventoryQuery,adminListingAction,adminListingBulk,adminInventoryList,adminListingDetail,adminMutateListing,adminBulkListings } from './admin-listings.service.js';

export const adminListingsRouter=Router();
const parse=<T>(schema:z.ZodType<T>,input:unknown):T=>{const result=schema.safeParse(input);if(!result.success)throw new ValidationError(result.error.issues.map(i=>i.message).join('; '));return result.data};
// Mounted after requireAdmin. Responses remain unit-based, including pagination.
adminListingsRouter.get('/',async(req,res,next)=>{try{res.json({data:await adminInventoryList(parse(adminInventoryQuery,req.query))})}catch(e){next(e)}});
adminListingsRouter.post('/bulk',async(req,res,next)=>{try{res.json({data:await adminBulkListings(parse(adminListingBulk,req.body),req.admin!)})}catch(e){next(e)}});
adminListingsRouter.get('/:id',async(req,res,next)=>{try{res.json({data:await adminListingDetail(parse(z.uuid(),req.params.id))})}catch(e){next(e)}});
adminListingsRouter.post('/:id/actions',async(req,res,next)=>{try{res.json({data:await adminMutateListing(parse(z.uuid(),req.params.id),parse(adminListingAction,req.body),req.admin!)})}catch(e){next(e)}});
