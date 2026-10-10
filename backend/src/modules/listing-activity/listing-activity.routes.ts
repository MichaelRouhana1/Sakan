import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { optionalAuth } from '../../middleware/auth.js';
import { activityInputSchema } from './activity-policy.js';
import { assertImpressionMeasurement, recordActivity } from './listing-activity.service.js';
export const listingActivityRouter = Router();
listingActivityRouter.post('/impressions', rateLimit({windowMs:60_000,limit:120,standardHeaders:true,legacyHeaders:false}), optionalAuth, async(req,res,next)=>{
  try {
    const input = activityInputSchema.extend({listingId:z.string().uuid(),measurement:z.enum(['web_viewable','expo_viewport']),placementToken:z.string().min(1).max(4096),sessionId:z.string().uuid()}).parse(req.body);
    assertImpressionMeasurement(input.platform,input.measurement);
    const result = await recordActivity(input.listingId,'featured_impression',input,{userId:req.user?.id,ip:req.ip},input.measurement);
    res.json({data:{counted:result.counted}});
  } catch(error) { next(error); }
});
