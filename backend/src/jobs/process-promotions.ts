import 'dotenv/config';
import { processPromotions } from '../modules/promotions/promotions.service.js';
// Deployment scheduler: */5 * * * * npm run job:promotions
processPromotions().then(result=>{console.log('Promotion worker',result);process.exit(0);}).catch(error=>{console.error('Promotion worker failed',error);process.exit(1);});
