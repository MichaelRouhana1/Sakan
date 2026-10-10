import { test, expect } from '@playwright/test';

const id = '11111111-1111-4111-8111-111111111111';
const products = [['featured',3,6],['featured',7,12],['featured',14,21],['featured',30,36],['bump',3,1],['bump',7,2]].map(([type,days,credits]) => ({ id:`${type}_${days}`, type, durationDays:days, credits, creditUnits:Number(credits)*100, pausable:type==='featured'&&Number(days)>=14, priceStatus:'published' }));
test('purchase controls, queue, defaults and responsive layout', async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname === '/api/promotions/catalog') data = { version:'test', salesEnabled:true, undoMinutes:15, products };
    if (url.pathname.endsWith('/options')) data = { listingId:id, eligible:true, reasons:[], markets:[{ key:'area:Hamra',label:'Hamra',kind:'area',availableSlots:0,capacity:3,queueLength:1,nextOpeningAt:null }], balanceCredits:50,balanceUnits:5000,expiresAt:new Date(Date.now()+30*86400000).toISOString(),currentCampaign:null };
    if (url.pathname === '/api/promotions' && route.request().method()==='POST') { payload=route.request().postDataJSON(); data={ id:'campaign',status:'queued',refundedCredits:0 }; }
    await route.fulfill({ json:{data} });
  });
  await page.goto(`/hosting/listing/${id}/promote?published=1`);
  await expect(page.getByText('Give your new listing a head start.')).toBeVisible();
  await expect(page.getByText('0 of 3 slots left')).toBeVisible();
  await expect(page.getByRole('switch')).not.toBeChecked();
  await page.getByRole('button',{name:'Queue next available',exact:true}).click();
  await expect.poll(()=>payload?.mode).toBe('queue');
  expect(payload?.autoRenew).toBe(false);
  expect(payload).not.toHaveProperty('credits');
  await page.getByRole('radio').filter({hasText:'A daily lift'}).click();
  await expect(page.getByRole('button',{name:'Start now',exact:true})).toBeEnabled();
  await page.screenshot({path:'frontend/.expo/promotion-desktop.png',fullPage:true});
  await page.setViewportSize({width:375,height:812});
  await expect(page.getByRole('button',{name:'Start now',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'frontend/.expo/promotion-mobile.png',fullPage:true});
});

test('unpublished prices block purchase and active reports show honest attribution', async ({ page }) => {
  let active = false;
  const campaign = { id:'22222222-2222-4222-8222-222222222222',listingId:id,listingTitle:'Hamra studio',type:'featured',productId:'featured_14',durationDays:14,pausable:true,marketLabel:'Hamra',status:'active',creditUnits:2100,credits:21,spentUnits:2100,spentCredits:21,refundedUnits:0,refundedCredits:0,remainingSeconds:10*86400,startedAt:new Date().toISOString(),endsAt:new Date(Date.now()+10*86400000).toISOString(),undoUntil:new Date(Date.now()+10*60000).toISOString(),autoRenew:false };
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    let data: unknown=[];
    if(path==='/api/promotions/catalog') data={version:'tbd',salesEnabled:false,undoMinutes:15,products:products.map(p=>({...p,priceStatus:'tbd'}))};
    if(path.endsWith('/options')) data={listingId:id,listingTitle:'Hamra studio',eligible:true,reasons:[],markets:[{key:'area:Hamra',label:'Hamra',availableSlots:2,capacity:3,queueLength:0}],balanceCredits:50,balanceUnits:5000,expiresAt:campaign.endsAt,currentCampaign:active?campaign:null};
    if(path===`/api/promotions/listings/${id}`) data=active?[campaign]:[];
    if(path.endsWith('/analytics')) data={period:{activeSeconds:86400},previousPeriod:{available:false,hadPromotion:false},during:{views:12,whatsappTaps:0},before:null,impressions:{total:50,webViewable:40,expoViewport:10},attributedTaps:0,costPerWhatsappTap:null,provisional:true};
    await route.fulfill({json:{data}});
  });
  await page.goto(`/hosting/listing/${id}/promote`);
  await expect(page.getByText('Prices are TBD. Purchases will open once final prices are published.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Start now',exact:true})).toBeDisabled();
  active=true;await page.reload();
  await expect(page.getByRole('button',{name:'Pause run',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Undo purchase/})).toBeVisible();
  await expect(page.getByText('Before: not enough recorded history').first()).toBeVisible();
  await expect(page.getByText(/no attributed taps yet/)).toBeVisible();
  await page.screenshot({path:'frontend/.expo/promotion-report.png',fullPage:true});
});
