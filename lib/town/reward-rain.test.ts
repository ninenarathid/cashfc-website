import {it,expect} from 'vitest';
import {rainCare} from './reward-rain';
import {extractionMarks} from './reward-actions';
import {newPurse,type Purse} from './trade';
import type {Plot} from './farm';
const t=Date.parse('2026-10-11T12:02:00+07:00'),at:[number,number]=[134,6];
const p:Purse={...newPurse(),bag:[{item:'can',n:1,water:3},null],hand:'can'};
const plot:Plot={soil:'tilled',plant:{by:'friend',crop:'pumpkin',sown:t,boost:0,watered:0,fed:0,guard:0,cured:0,picked:0,pickedAt:0}};
it('keeps normal finite rain deadlines and pays only real water and stamina',()=>{
 const sky:[[number,number]]=[[t,t+600000]],b=rainCare(p,{action:'rainCareBegin',at},'r',t,123,'me',plot,sky,true,'loadout');
 if(!b.ok)throw Error('begin');
 const e=rainCare(b.purse,{action:'rainCareEnd',at,run:'r',marks:extractionMarks(123)},'r',t+2400,0,'me',plot,sky,true,'loadout');
 if(!e.ok)throw Error('finish');
 expect(e.plots?.['134,6'].plant?.wetUntil).toBe(t+600000+3600000);
 expect(e.purse.bag[0]?.water).toBe(2);
 expect(e.plots?.['134,6'].plant?.boost).toBe(0);
});
it('bounds the browser’s perpetual-rain fixture to one weather slot instead of infinite wetness',()=>{
 const sky:[[number,number]]=[[0,Number.MAX_SAFE_INTEGER]],b=rainCare(p,{action:'rainCareBegin',at},'r',t,123,'me',plot,sky,true,'loadout');
 if(!b.ok)throw Error('begin');
 const e=rainCare(b.purse,{action:'rainCareEnd',at,run:'r',marks:extractionMarks(123)},'r',t+2400,0,'me',plot,sky,true,'loadout');
 if(!e.ok)throw Error('finish');
 expect(e.plots?.['134,6'].plant?.wetUntil).toBe((Math.floor(t/900000)+1)*900000+3600000);
 expect(e.plots?.['134,6'].plant?.wetUntil).toBeLessThan(t+4500000);
});
