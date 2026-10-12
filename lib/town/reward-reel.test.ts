import{it,expect}from'vitest';import{startFight,stepFight,startPair,stepPair,surging}from'./fishing';import{pullReel,pullPairReel}from'./reward-reel';import{fishQuiet,comboLoadout}from'./private/combos';import{newPurse,type Purse}from'./trade';
it('requires five actual seconds in this safe band, pulls only once, and adds an immediate counterattack',()=>{
 let f=startFight('catfish','good',{lunar:true},42);expect(pullReel(f)).toBe(f);const outside=stepFight({...f,tension:1},false,.1);expect(outside.lunar?.charge).toBe(0);
 for(let i=0;i<320&&!f.over;i++){f=stepFight({...f,tension:f.at,line:10,length:10,strain:0,slack:0},false,1/60);}expect(f.lunar?.charge).toBe(5);
 const d=pullReel(f);expect(d.line).toBeCloseTo(f.line*.8);expect(d.lunar?.used).toBe(true);expect(surging(d)).toBe(true);expect(pullReel(d)).toBe(d);expect(pullReel({...f,over:'landed'})).toEqual({...f,over:'landed'});
 const quiet=pullReel(f,2);expect(surging(quiet)).toBe(false);expect(stepFight({...quiet,tension:quiet.at},false,.05).at).toBe(quiet.at);
});
it('separate pair charges and quiet windows cannot grant progress or shorten the other fish',()=>{
 const p=startPair(['barb','catfish'],'good',{lunar:true,narrow:.8},31),before=p.fights[1];
 p.fights[0]={...p.fights[0],lunar:{charge:5,used:false}};const d=pullPairReel(p,0,2);expect(d.fights[0].line).toBeCloseTo(p.fights[0].line*.8);expect(d.fights[1]).toBe(before);expect(pullPairReel(d,1)).toBe(d);
 const after=stepPair({...p,tension:p.lo[0]},false,.01);expect(after.fights[1].lunar?.charge??0).toBeLessThanOrEqual(.01);
});
it('requires a running current or actual world rain, preserves loadout snapshot, shares five fish and never discovers a failed match',()=>{
 const p:Purse={...newPurse(),orb:{sky:'rain',until:9999999999999},gifts:{had:['charmLunarReel','famFrog','charmFloat','charmWind'],charms:['charmLunarReel'],familiar:'famFrog'}},t=1791712800000;
 expect(fishQuiet(p,'a','lunar','run',false,t,comboLoadout(p))).toBeNull();let live=p;
 for(let i=0;i<5;i++){const d=fishQuiet(live,'fish'+i,'lunar','eddy',true,t,comboLoadout(live));expect(d?.effect.quiet).toBe(2);live=d!.purse;}
 expect(fishQuiet(live,'six','lunar','run',true,t,comboLoadout(live))).toBeNull();const wind={...live,gifts:{...live.gifts!,charms:['charmFloat','charmWind'],familiar:null}} as Purse;
 expect(fishQuiet(wind,'seven','hook','run',false,t,comboLoadout(wind))).toBeNull();expect(fishQuiet(wind,'one','hook','eddy',false,t,comboLoadout(wind))).toBeNull();expect(fishQuiet(wind,'one','hook','run',true,t,comboLoadout(p))).toBeNull();expect(live.combos?.found.map(x=>x.key)).toEqual(['SC16']);
});
