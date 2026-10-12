"use client";

import { ALL_GIFTS, type GiftId } from '@/lib/town/gifts';
import { GIFT_GUIDES, GUIDE_COMMON, type GuideId, type WaterGiftId } from '@/lib/town/gift-guides';
import { ITEMS } from '@/lib/town/items';
import { LINES } from '@/lib/town/lines';
import { WATER } from '@/lib/town/farm';
import TownNotebook, { type NotebookEntry } from './TownNotebook';
import type { IconName } from './TownIcon';

export default function TownGiftBook({ owned, containers, th, first, onClose }: {
 owned: readonly GiftId[]; containers: readonly WaterGiftId[]; th: boolean;
 first?: GuideId | null; onClose: () => void;
}) {
 const lang = th ? 'th' : 'en';
 const entries: NotebookEntry[] = [{
  key: 'basics', title: th ? 'เริ่มใช้รางวัลอย่างไร' : 'Start using your rewards', icon: 'wellBook',
  category: th ? 'เริ่มตรงนี้' : 'Start here',
  body: <ol className="list-decimal space-y-3 pl-5">{GUIDE_COMMON[lang].map(s => <li key={s}>{s}</li>)}</ol>,
 }];
 const gifts = ALL_GIFTS.filter(g => owned.includes(g.id)).sort((a,b)=>a.line.localeCompare(b.line)||a.rank-b.rank);
 const pages = [...gifts.map(g => ({id:g.id, name:g.name[lang], line:g.line, rank:g.rank, kind:g.kind, effect:g.does[lang]})),
  ...containers.map(id=>({id,name:ITEMS[id].name[lang],line:'well' as const,rank:id==='waterYoke'?1:id==='waterCart'?2:3,kind:'carry',effect:th?`ขนน้ำได้ ${WATER.buckets[id]} ถังต่อเที่ยว`:`Carries ${WATER.buckets[id]} bucketfuls per trip`}))];
 for (const page of pages) {
  const [where,prepare,one,two,remember] = GIFT_GUIDES[page.id][lang];
  const activate = page.kind==='charm' ? th?'ใส่ในช่องเครื่องรางที่หน้า “ตัวฉัน” ก่อนเริ่ม':'Equip this charm in Me before starting.'
   :page.kind==='familiar'? th?'เรียกสัตว์หรือภูตตัวนี้ให้เดินตามจากหน้า “ตัวฉัน” ก่อนเริ่ม':'Call this familiar from Me before starting.'
   :page.kind==='carry'? th?'รับจากสมุดหาบน้ำ แล้วถือภาชนะจากกระเป๋า':'Claim from the water-carriers book, then hold the container from your bag.'
   :th?'รับรางวัลแล้วใช้ผ่านปุ่มกิจกรรม ไม่ต้องใส่ในช่องเครื่องราง':'Claim it, then use its activity button; no charm slot is needed.';
  entries.push({key:page.id,title:page.name,icon:page.id as IconName,category:LINES[page.line].name[lang],searchText:`${where} ${prepare}`,body:
   <div className="space-y-4" data-gift-guide={page.id}>
    <p className="text-meta">{LINES[page.line].name[lang]} · {th?'ระดับ':'Rank'} {page.rank}</p>
    <div><h5 className="font-semibold">{th?'เปิดใช้':'Activate'}</h5><p>{activate}</p></div>
    <div><h5 className="font-semibold">{th?'ใช้ที่ไหน':'Where'}</h5><p>{where}</p></div>
    <div><h5 className="font-semibold">{th?'เตรียมอะไร':'Prepare'}</h5><p>{prepare}</p></div>
    <div><h5 className="font-semibold">{th?'ทำอย่างไร':'Steps'}</h5><ol className="list-decimal space-y-2 pl-5"><li>{one}</li><li>{two}</li></ol></div>
    <div><h5 className="font-semibold">{th?'ผลที่ได้และจำนวนใช้':'Effect and allowance'}</h5><p>{page.effect}</p></div>
    <div className="rounded-lg border border-ink/20 p-3"><h5 className="font-semibold">{th?'จำไว้ก่อนเริ่ม':'Before starting'}</h5><p>{remember}</p></div>
   </div>});
 }
 return <div className="mb-2" data-gift-book><TownNotebook key={first??'index'} compact icon="wellBook" title={th?'คู่มือใช้รางวัลอาชีพ':'Profession reward guide'} entries={entries} th={th} first={first} initiallyOpen={!!first} onClose={first?onClose:undefined}/></div>;
}
