import type { Dish, Item, Make } from "./items";

const item=(kind:Item["kind"],th:string,en:string,shapeTh:string,shapeEn:string,pays:number,tier:1|2|3=2):Item=>({kind,tier,name:{th,en},about:{th:shapeTh,en:shapeEn},stack:kind==="tool"?1:20,pays});
/** Parts found by inspecting ordinary gathering places, rather than diluting their original finds. */
export const FORAGE_ITEMS={
  forestLichen:item("wild","ไลเคนป่า","Forest lichen","ไลเคนสีเขียวเทาแตกแขนง","Branching pale sage lichen",5),
  fragrantPetal:item("wild","กลีบดอกหอม","Fragrant petals","กลีบดอกสีชมพูม่วงหอมอ่อน","Soft fragrant magenta petals",6),
  flowerBulb:item("wild","หัวดอกไม้ป่า","Wild flower bulb","หัวสีน้ำตาลมีหน่อสีเขียว","An earthy bulb with tiny green shoots",11),
  bambooSheath:item("wild","กาบไผ่อ่อน","Young bamboo sheath","กาบสีน้ำตาลอ่อนขอบบาง","A thin-edged tan bamboo sheath",5),
  fernTip:item("wild","ยอดเฟิร์นป่า","Wild fern tip","ยอดสีเขียวม้วนเป็นวง","A curled bright green fern tip",7),
  wildMedicRoot:item("wild","รากสมุนไพรป่า","Forest medicinal root","รากสีม่วงเข้มมีปมเล็ก","A knotted violet medicinal root",14,3),
  berryPip:item("wild","เมล็ดเบอร์รีป่า","Wild berry seeds","เมล็ดเล็กวางบนใบไม้","Little berry seeds on a leaf",10),
  mushroomSpores:item("wild","สปอร์เห็ดป่า","Forest mushroom spores","ผงสปอร์ในใบไม้พับ","Mushroom spores in a folded leaf",9),
  lichenSalt:item("staple","เกลือไลเคน","Lichen salt","เกลือหยาบสีเขียวในถ้วย","Coarse green lichen salt in a bowl",12),
  petalDye:item("goods","สีจากกลีบดอก","Petal dye","สีแดงเข้มในไหเปิดฝา","Dark red petal dye in an open jar",16),
  bulbPowder:item("staple","ผงหัวดอกไม้","Flower bulb powder","ผงสีครีมในถุงผ้า","Cream bulb powder in a cloth sachet",19),
  driedFern:item("staple","เฟิร์นตากแห้ง","Dried fern","ใบเฟิร์นแห้งมัดเชือก","Tied dried fern leaves",17),
  rootExtract:item("staple","น้ำสกัดรากป่า","Forest root extract","น้ำสมุนไพรสีม่วงเข้มในขวด","Dark violet herbal extract in a bottle",24,3),
  berrySeedOil:item("staple","น้ำมันเมล็ดเบอร์รี","Berry seed oil","น้ำมันใสสีทองในขวด","Glossy golden seed oil in a bottle",22),
  sporeCulture:item("staple","เชื้อเห็ดป่า","Forest spore culture","เชื้อเห็ดสีครีมในถ้วยดิน","Ivory mushroom culture in an earthen cup",23),
  traceLens:item("tool","เลนส์อ่านร่องรอย","Trail lens","เลนส์ติดด้ามกิ่งไม้แกะ","A round lens on a carved twig handle",30),
  pruningKnife:item("tool","มีดเก็บยอด","Pruning knife","มีดโค้งเล็กด้ามไม้","A small curved knife with a wooden handle",26),
  rootSpade:item("tool","เสียมขุดราก","Root spade","เสียมหัวสี่เหลี่ยมเล็ก","A tiny square-headed spade",31),
  seedSieve:item("tool","ตะแกรงร่อนเมล็ด","Seed sieve","ตะแกรงสานกลมขอบไม้","A round woven sieve with wooden rim",27),
  specimenPress:item("tool","แผ่นอัดตัวอย่างพืช","Specimen press","แผ่นไม้ประกบใบเฟิร์น","Two wooden plates holding a fern",28),
  forageBasket:item("tool","ตะกร้าถนอมของป่า","Foraging basket","ตะกร้าลึกรองใบไม้หนา","A deep woven basket padded with leaves",32),
  fernRice:item("dish","ข้าวยอดเฟิร์น","Fern rice","ข้าวกับยอดเฟิร์นในใบตอง","Fern rice in a banana leaf",25),
  rootStew:item("dish","ซุปรากสมุนไพร","Herbal root stew","ซุปเข้มกับรากสมุนไพร","A rich stew with forest roots",32,3),
  petalBiscuit:item("dish","ขนมกลีบดอกป่า","Forest petal biscuits","ขนมสีครีมโรยกลีบดอก","Cream biscuits scattered with petals",27),
  sporeNoodles:item("dish","ก๋วยเตี๋ยวเห็ดป่า","Forest mushroom noodles","เส้นก๋วยเตี๋ยวกับเห็ดในซุปใส","Mushroom noodles in clear broth",29),
} as const;
export const FORAGE_RAW=["forestLichen","fragrantPetal","flowerBulb","bambooSheath","fernTip","wildMedicRoot","berryPip","mushroomSpores"] as const;
export const FORAGE_TOOLS=["traceLens","pruningKnife","rootSpade","seedSieve","specimenPress","forageBasket"] as const;
export const FORAGE_MAKES={
  lichenSalt:{needs:[["forestLichen",2],["salt",1]],in:["mortar"],gives:2},
  petalDye:{needs:[["fragrantPetal",3],["oil",1]],in:["pot"],gives:2},
  bulbPowder:{needs:[["flowerBulb",2]],in:["mortar"],gives:2},
  driedFern:{needs:[["fernTip",3],["bambooSheath",1]],in:["pan"],gives:2},
  rootExtract:{needs:[["wildMedicRoot",2],["sugar",1]],in:["pot"],gives:2},
  berrySeedOil:{needs:[["berryPip",3]],in:["mortar"],gives:2},
  sporeCulture:{needs:[["mushroomSpores",2],["rice",1]],in:["jar"],gives:2},
} satisfies Record<string,Make>;
export const FORAGE_CRAFTS={
  traceLens:[["crystalLens",1],["carvingBlank",1]],pruningKnife:[["oreIron",2],["splitPlank",1],["petalDye",1]],
  rootSpade:[["oreIron",2],["heartwood",1],["berrySeedOil",1]],seedSieve:[["bambooSheath",3],["rootTwine",1]],
  specimenPress:[["splitPlank",2],["petalDye",1],["silkenCord",1]],forageBasket:[["bambooSheath",4],["silkenCord",2],["beeswax",1]],
} as const;
export type ForageDishId="fernRice"|"rootStew"|"petalBiscuit"|"sporeNoodles";
export const FORAGE_DISHES:Record<ForageDishId,Dish>={
  fernRice:{stamina:28,buff:"traces",recipe:{needs:[["fernTip",2],["rice",2],["lichenSalt",1]],in:["pot"],serves:3,cooks:1}},
  rootStew:{stamina:36,buff:"traces",recipe:{needs:[["rootExtract",1],["lotusRootBed",1],["lichenSalt",1]],in:["pot"],serves:3,cooks:1}},
  petalBiscuit:{stamina:30,buff:"traces",recipe:{needs:[["bulbPowder",1],["flour",2],["fragrantPetal",1]],in:["pan"],serves:3,cooks:1}},
  sporeNoodles:{stamina:32,buff:"traces",recipe:{needs:[["sporeCulture",1],["noodle",1],["driedFern",1]],in:["pot"],serves:3,cooks:1}},
};
export const FORAGE_SCROLLS={scrollFernRice:"fernRice",scrollRootStew:"rootStew",scrollPetalBiscuit:"petalBiscuit",scrollSporeNoodles:"sporeNoodles"} as const;
export const FORAGE_SCROLL_ITEMS=Object.fromEntries(Object.entries(FORAGE_SCROLLS).map(([id,dish])=>[id,item("scroll",`ม้วนสูตร ${FORAGE_ITEMS[dish].name.th}`,`Recipe scroll: ${FORAGE_ITEMS[dish].name.en}`,"ม้วนสูตรผูกเชือก","A rolled recipe tied with cord",12,FORAGE_ITEMS[dish].tier)])) as Record<keyof typeof FORAGE_SCROLLS,Item>;
