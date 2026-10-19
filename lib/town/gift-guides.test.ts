import {describe,it,expect} from 'vitest';
import {ALL_GIFTS} from './gifts';
import {GIFT_GUIDES,GUIDE_COMMON} from './gift-guides';

describe('public reward instructions',()=>{
 it('covers all 101 current rewards without unreleased entries',()=>{
  const ids=[...ALL_GIFTS.map(g=>g.id),'waterYoke','waterCart','waterYokeGreat'];
  expect(ids).toHaveLength(101);
  expect(Object.keys(GIFT_GUIDES).sort()).toEqual(ids.sort());
 });
 it('has a location, preparation, two ordered actions and a constraint in both languages',()=>{
  for(const guide of Object.values(GIFT_GUIDES))for(const language of ['th','en'] as const){
   expect(guide[language]).toHaveLength(5);
   for(const text of guide[language])expect(text.trim().length).toBeGreaterThan(5);
  }
  expect(GUIDE_COMMON.th).toHaveLength(GUIDE_COMMON.en.length);
 });
 it('explains the important irreversible costs and the actual manual-cooking requirement',()=>{
  expect(GIFT_GUIDES.thingDragonPot.th[4]).toContain('ไม่คืนอาหาร');
  expect(GIFT_GUIDES.thingGiantSeeds.th[4]).toContain('เมล็ดยังอยู่');
  expect(GIFT_GUIDES.charmChefFlame.th[4]).toContain('ไม่ใช้ภูตข้ามเกม');
  expect(GIFT_GUIDES.thingFlavorBook.th[4]).toContain('ถ้วยที่ตักใส่กระเป๋า');
  expect(GIFT_GUIDES.thingPocketLift.th[4]).toContain('หกขา');
 });
});
