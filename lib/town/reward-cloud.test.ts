import {it,expect} from 'vitest';
import {callCloud,type CloudWorld} from './reward-cloud';
import {newPurse,type Purse} from './trade';
import {extractionMarks} from './reward-actions';
import {grown,see} from './farm';
const now=Date.parse('2026-10-11T12:00:00+07:00'),me='00000000-0000-4000-8000-000000000001',friend='00000000-0000-4000-8000-000000000002',at:[number,number]=[132,4];
const p=():Purse=>({...newPurse(),bag:[{item:'waterCart',n:1,water:6},null],hand:'waterCart',handAt:0,gifts:{had:['thingCloudJar'],charms:[]}});
const world=():CloudWorld=>({plots:{'132,4':{soil:'tilled',plant:{by:me,crop:'kangkong',sown:now-60000,watered:0,fed:0,guard:0,cured:0,picked:0,pickedAt:0,boost:0}}},owners:{0:me,1:friend},consents:{1:{by:friend,giver:me,until:now+10000}},kind:'dawn',rains:[]});
it('needs live consent and real water; one event gives ten minutes of rain and no future rain growth',()=>{
 const w=world(),b=callCloud(p(),{action:'cloudBegin',beds:[0,1],at},'run',me,w,now,123);if(!b.ok||!b.cloud)throw Error('No cloud');
 const input={action:'cloudEnd' as const,run:'run',marks:extractionMarks(123),at},revoked={...w,consents:{}};
 expect(callCloud(b.purse,input,'end',me,revoked,now+3000,0)).toEqual({ok:false,why:'theirs'});
 const d=callCloud(b.purse,input,'end',me,w,now+3000,0);if(!d.ok||!d.plots)throw Error('No result');const plot=d.plots['132,4'];
 expect(d.purse.bag[0]?.water).toBe(5);expect(d.purse.gifts?.used?.thingCloudJar?.n).toBe(1);
 expect(see('132,4',plot,now+3000).wet).toBe(true);expect(see('132,4',plot,now+603000).wet).toBe(false);
 const baseline={...plot.plant!,localRain:undefined};expect(grown(plot.plant!,now+3000)-grown(baseline,now+3000)).toBe(0);
 expect(grown(plot.plant!,now+603000)-grown(baseline,now+603000)).toBeCloseTo(5/60);
 expect(grown(plot.plant!,now+1203000)-grown(baseline,now+1203000)).toBeCloseTo(5/60);
 expect(grown(plot.plant!,now+603000,[[now+3000,now+603000]])-grown(baseline,now+603000,[[now+3000,now+603000]])).toBeCloseTo(0);
 expect(callCloud(d.purse,{action:'cloudBegin',beds:[0],at},'again',me,{...w,plots:d.plots},now+603000,1)).toEqual({ok:false,why:'none'});
});
it('misses consume one real catalyst and daily use, and replanted roots cannot inherit the cloud',()=>{
 const w=world(),b=callCloud(p(),{action:'cloudBegin',beds:[0],at},'run',me,w,now,123);if(!b.ok)throw Error('No run');
 const failed=callCloud(b.purse,{action:'cloudEnd',run:'run',marks:[0,0,0],at},'miss',me,w,now+3000,0);if(!failed.ok)throw Error('No miss');
 expect(failed.watered).toEqual([]);expect(failed.purse.bag[0]?.water).toBe(5);expect(failed.purse.gifts?.used?.thingCloudJar?.n).toBe(1);
 w.plots['132,4'].plant!.sown++;
 expect(callCloud(b.purse,{action:'cloudEnd',run:'run',marks:extractionMarks(123),at},'end',me,w,now+3000,0)).toEqual({ok:false,why:'none'});
 expect(callCloud(p(),{action:'cloudConsent',giver:me,at},'fake',friend,w,now,0)).toEqual({ok:false,why:'theirs'});
});
