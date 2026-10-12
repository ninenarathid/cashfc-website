import { expect,it } from 'vitest';
import { beanAction,beanNode } from './reward-bean';
import { trailAnswer } from './reward-trails';
import { newPurse,held,type Purse } from './trade';
import { CROPS } from './items';
import type { Plot } from './farm';
const t=Date.parse('2026-10-11T12:00:00+07:00'),at:[number,number]=[134,6],plot:Plot={soil:'tilled',plant:{by:'me',crop:'longBean',sown:t,boost:0,watered:0,fed:0,guard:t+86400000,cured:0,picked:0,pickedAt:0}},p:Purse={...newPurse(),bag:[{item:'longBean',n:3},{item:'seedLongBean',n:1},...Array(8).fill(null)],gifts:{had:['thingSkyBean'],charms:[],familiar:null},gardenBook:['rowBean']};
const call=(q:Purse,c:Parameters<typeof beanAction>[1],time=t)=>beanAction(q,c,'request',time,4294967200,'me',plot,[]);
it('pays actual start supplies, checkpoints failed stages and pays one finite known harvest once',()=>{
 let d=call(p,{action:'beanBegin',at});if(!d.ok||!d.bean)throw Error('start');expect(held(d.purse.bag,'longBean')).toBe(0);expect(held(d.purse.bag,'seedLongBean')).toBe(0);expect(call(d.purse,{action:'beanBegin',at}).ok).toBe(false);
 let q=d.purse;
 for(let i=0;i<3;i++){d=call(q,{action:'beanStage',run:'request',at},t+i*3000);if(!d.ok||!d.bean?.challenge)throw Error('stage');const c={action:'beanEnd' as const,run:'request',challenge:'request',answers:trailAnswer(beanNode(d.bean)),at};expect(call(d.purse,c,t+i*3000+2399).ok).toBe(false);d=call(d.purse,c,t+i*3000+2400);if(!d.ok)throw Error('end');q=d.purse;expect(q.professionRewards?.bean?.next??3).toBe(i+1);}
 expect(held(q.bag,'longBean')).toBe(6);expect(held(q.bag,'seedRowBean')).toBe(1);expect(q.professionRewards?.bean).toBeNull();expect(call(q,{action:'beanEnd',run:'request',challenge:'request',answers:[0],at},t+10000).ok).toBe(false);
});
it('refuses foreign/dead/moved roots, expires and cancels without refunding start materials',()=>{
 expect(beanAction(p,{action:'beanBegin',at},'run',t,123,'friend',plot,[]).ok).toBe(false);
 const d=call(p,{action:'beanBegin',at});if(!d.ok)throw Error('start');expect(call(d.purse,{action:'beanStage',run:'request',at:[137,6]}).ok).toBe(false);expect(call(d.purse,{action:'beanStage',run:'request',at},t+1800001).ok).toBe(false);const cancel=call(d.purse,{action:'beanCancel',at});if(!cancel.ok)throw Error('cancel');expect(held(cancel.purse.bag,'longBean')).toBe(0);
 expect(CROPS.longBean).toBeDefined();
});
it('a full bag preserves the final checkpoint and daily start quota',()=>{
 const b=call(p,{action:'beanBegin',at});if(!b.ok||!b.bean)throw Error('start');const r={...b.bean,next:2,challenge:{id:'request',began:t,until:t+90000}},q:Purse={...b.purse,bag:[{item:'stone',n:9999}],professionRewards:{...b.purse.professionRewards,bean:r}},c={action:'beanEnd' as const,run:'request',challenge:'request',answers:trailAnswer(beanNode(r)),at};expect(call(q,c,t+2400)).toEqual({ok:false,why:'full'});expect(q.professionRewards?.bean).toEqual(r);
});
