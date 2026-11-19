import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createListingSchema, updateListingSchema } from '../dist/modules/listings/listings.schemas.js';
import { publishUnitsSchema } from '../dist/modules/listings/unit-publish.service.js';
import { copySuggestSchema } from '../dist/modules/listings/copy-suggest.schemas.js';

const details = {
  spaceType:'private_room',propertyType:'apartment',monthlyRentUsd:650,securityDepositUsd:650,
  electricity:'solar',water:'state_well_24_7',bedrooms:1,beds:1,bathrooms:1,maxOccupancy:1,
  furnishingType:'furnished',floorNumber:1,title:'Bright room in Gemmayzeh',
  description:'A furnished room near campus with a study desk.',contactName:'Test Host',
  contactPhone:'+96171123456',area:'Gemmayzeh',locationWkt:'POINT(35.52 33.89)',
  photoUrls:['/uploads/a.jpg','/uploads/b.jpg','/uploads/c.jpg'],
};
const batch = unit => ({requestId:'10000000-0000-4000-8000-000000000001',expectedTotal:0,
  kind:'apartment',shared:details,sharedPhotos:[],units:[{details:unit,bathroomPrivacy:'private'}]});

test('normal USD rent and inclusive sanity boundaries can publish and edit', () => {
  for (const monthlyRentUsd of [1,650,10000]) {
    const input={...details,monthlyRentUsd,securityDepositUsd:20000};
    assert.equal(createListingSchema.parse(input).monthlyRentUsd,monthlyRentUsd);
    assert.equal(updateListingSchema.parse(input).monthlyRentUsd,monthlyRentUsd);
    assert.ok(publishUnitsSchema.safeParse(batch(input)).success);
  }
});

test('the Gemmayzeh amount and other invalid prices are blocked in create, batch and edit', () => {
  for (const monthlyRentUsd of [234432,'234432',10001,0,-1,650.5]) {
    const input={...details,monthlyRentUsd};
    for (const schema of [createListingSchema,updateListingSchema]) {
      const result=schema.safeParse(input); assert.equal(result.success,false);
      assert.ok(result.error.issues.some(x=>x.path[0]==='monthlyRentUsd'));
    }
    const result=publishUnitsSchema.safeParse(batch(input));assert.equal(result.success,false);
    assert.ok(result.error.issues.some(x=>x.path.join('.')==='units.0.details.monthlyRentUsd'));
  }
  const result=createListingSchema.safeParse({...details,monthlyRentUsd:234432});
  assert.match(result.error.issues[0].message,/USD.*10,000.*LBP/);
});

test('deposits and copy generation also reject currency-sized values', () => {
  for (const securityDepositUsd of [234432,20001,-1,650.5]) {
    assert.equal(createListingSchema.safeParse({...details,securityDepositUsd}).success,false);
    assert.equal(updateListingSchema.safeParse({...details,securityDepositUsd}).success,false);
    assert.equal(publishUnitsSchema.safeParse(batch({...details,securityDepositUsd})).success,false);
  }
  assert.ok(copySuggestSchema.safeParse({mode:'all',facts:{monthlyRentUsd:650,securityDepositUsd:1300}}).success);
  assert.equal(copySuggestSchema.safeParse({mode:'all',facts:{monthlyRentUsd:234432}}).success,false);
  assert.equal(copySuggestSchema.safeParse({mode:'all',facts:{securityDepositUsd:234432}}).success,false);
});
