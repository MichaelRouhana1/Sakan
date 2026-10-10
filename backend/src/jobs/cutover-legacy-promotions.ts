import 'dotenv/config';
import { cutoverLegacyPromotions } from '../modules/promotions/legacy-promotions.service.js';
// Clear old placement timestamps and credit unused service atomically. Retry-safe.
cutoverLegacyPromotions().then(result => { console.log(result); process.exit(0); }).catch(error => { console.error(error); process.exit(1); });
