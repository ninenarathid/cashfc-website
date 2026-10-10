import type { Dish, Item } from "./items";
const item=(kind:Item["kind"],th:string,en:string,pays:number,look:[string,string],tier:2|3=2):Item=>({kind,tier,name:{th,en},about:{th:look[0],en:look[1]},stack:kind==="tool"?1:20,pays});
export const CAMP_ITEMS={
 trailRation:item("goods","เสบียงเดินทาง","Trail ration",18,["ข้าวและผักแห้งห่อใบไม้","Rice and dried vegetables wrapped in leaves."]),
 mintPoultice:item("goods","ห่อสมุนไพรเย็น","Mint poultice",19,["ใบเขียวบดห่อผ้าบาง","Crushed green leaves in thin cloth."]),
 repairBundle:item("goods","มัดวัสดุซ่อม","Repair bundle",20,["ไม้และเชือกมัดคู่กัน","Wood and cord bundled together."]),
 seedPacket:item("goods","ห่อเมล็ดสำหรับเพื่อน","Shared seed packet",18,["ซองใบไม้มีเมล็ดเล็กหลายสี","A leaf packet with small coloured seeds."]),
 waterPack:item("goods","ห่อน้ำเดินทาง","Travel water pack",20,["ขวดน้ำมีเชือกและใบไม้หุ้ม","A water bottle wrapped in leaves and cord."]),
 dryTinder:item("goods","เชื้อไฟแห้ง","Dry tinder",16,["เศษไม้แห้งมัดเป็นพุ่มเล็ก","A small tied bundle of dry wood."]),
 campCanvas:item("goods","ผืนผ้าค่าย","Camp canvas",22,["ผ้าสีน้ำตาลพับ มีขอบเย็บ","Folded brown cloth with stitched edges."]),
 signalCord:item("goods","เชือกสัญญาณ","Signal cord",18,["เชือกขดติดผ้าสีแดง","A coiled cord with a red cloth tag."]),
 warmBlanket:item("goods","ผ้าห่มเดินป่า","Trail blanket",27,["ผ้าม้วนหนาสีเขียวผูกเชือก","Thick rolled green cloth tied with cord."],3),
 fieldBandage:item("goods","ผ้าพันแผลสนาม","Field bandage",25,["ผ้าขาวม้วนมีใบเขียวข้างๆ","Rolled white cloth beside green leaves."],3),
 travelBiscuit:item("goods","ขนมพกทางไกล","Travel biscuit",24,["ขนมแผ่นกลมสีน้ำตาลในห่อ","Round brown biscuits in a wrapper."],3),
 sharedTea:item("goods","ชาชงแบ่งกัน","Shared tea",25,["เหยือกชาสีอ่อนกับถ้วยเล็ก","A pale tea jug beside a small cup."],3),
 soilCarePack:item("goods","ห่อดูแลดิน","Soil care pack",26,["ห่อสีน้ำตาลมีเมล็ดและผงเข้ม","A brown packet of seeds and dark powder."],3),
 toolCareOil:item("goods","น้ำมันดูแลอุปกรณ์","Tool care oil",26,["ขวดน้ำมันสีน้ำตาลมีจุกเล็ก","A brown oil bottle with a small stopper."],3),
 trailMarker:item("goods","ป้ายทางเดิน","Trail marker",27,["ป้ายไม้ผูกผ้าสีแดง","A wooden marker tied with red cloth."],3),
 campKit:item("tool","ชุดตั้งค่าย","Camp kit",40,["ผ้า เสา และเชือกมัดรวมกัน","Canvas, poles and cord bundled together."]),
 provisionChest:item("tool","กล่องเสบียงค่าย","Provision chest",38,["หีบไม้มีฝาและหูจับ","A wooden chest with a lid and handle."]),
 fieldKettle:item("tool","กาต้มน้ำสนาม","Field kettle",36,["กาทองแดงมีหูหิ้วและฝา","A copper kettle with a carrying handle."]),
 campLantern:item("tool","โคมค่าย","Camp lantern",39,["โคมทองแดงมีช่องแสงสีเหลือง","A copper lantern with a yellow window."],3),
 weatherAwning:item("tool","กันสาดค่าย","Camp awning",43,["ผืนผ้าเขียวขึงบนเสาสองต้น","Green cloth stretched over two poles."],3),
 signalPennant:item("tool","ธงส่งสัญญาณค่าย","Camp pennant",41,["ธงแดงปลายแหลมบนเสาไม้","A pointed red pennant on a wooden pole."],3),
 sharePorridge:item("dish","ข้าวต้มแบ่งเพื่อน","Shared porridge",31,["ข้าวต้มสีครีมกับใบเขียว","Cream porridge topped with green leaves."],3),
 travelerSoup:item("dish","ซุปนักเดินทาง","Traveler soup",33,["ซุปสีทองมีผักหั่นเต๋า","Golden broth with diced vegetables."],3),
 friendRice:item("dish","ข้าวมิตรสหาย","Friends' rice",35,["ข้าวผสมผักหลายสีในชาม","Rice with colourful vegetables in a bowl."],3),
 restTea:item("dish","ชามื้อพัก","Rest tea",34,["ชาสีอำพันในถ้วย มีใบข้างขอบ","Amber tea in a cup with a leaf at its edge."],3),
} as const;
export const CAMP_TOOLS=["campKit","provisionChest","fieldKettle","campLantern","weatherAwning","signalPennant"] as const;
export const CAMP_CRAFTS={
 trailRation:[["emberRice",2],["driedFern",1]],mintPoultice:[["waterMint",2],["silkCocoon",1]],repairBundle:[["splitPlank",1],["rootTwine",1]],
 seedPacket:[["berryPip",2],["bambooSheath",1]],waterPack:[["clearSpring",2],["reedPith",1]],dryTinder:[["pineBark",2],["resin",1]],
 campCanvas:[["silkCocoon",3],["silkenCord",1]],signalCord:[["rootTwine",2],["petalDye",1]],
 warmBlanket:[["campCanvas",2],["mossFilter",1]],fieldBandage:[["mintPoultice",1],["campCanvas",1]],travelBiscuit:[["bulbPowder",1],["sweetGlaze",1]],
 sharedTea:[["herbalWater",2],["waterMint",1]],soilCarePack:[["seedPacket",1],["compost",2]],toolCareOil:[["berrySeedOil",1],["rootExtract",1]],trailMarker:[["splitPlank",1],["signalCord",1]],
 campKit:[["campCanvas",2],["splitPlank",2],["signalCord",1]],provisionChest:[["splitPlank",4],["oreIron",1]],fieldKettle:[["oreCopper",3],["heartwood",1]],
 campLantern:[["oreCopper",2],["beeswax",2],["crystalLens",1]],weatherAwning:[["campCanvas",3],["splitPlank",2]],signalPennant:[["splitPlank",1],["signalCord",2],["petalDye",1]],
} as const;
export const CAMP_DISHES={
 sharePorridge:{stamina:32,buff:"campPreparation",recipe:{needs:[["emberRice",2],["herbalWater",1],["dicedRoot",1]],in:["pot"],serves:4,cooks:1}},
 travelerSoup:{stamina:35,buff:"campPreparation",recipe:{needs:[["thickBroth",1],["dicedRoot",2],["smokedSalt",1]],in:["pot"],serves:4,cooks:1}},
 friendRice:{stamina:36,buff:"campPreparation",recipe:{needs:[["emberRice",2],["dicedRoot",1],["fragrantOil",1]],in:["pan"],serves:4,cooks:1}},
 restTea:{stamina:34,buff:"campPreparation",recipe:{needs:[["herbalWater",2],["driedZest",1],["sweetGlaze",1]],in:["fieldKettle"],serves:4,cooks:1}},
} satisfies Record<string,Dish>;
export type CampDishId=keyof typeof CAMP_DISHES;
export const CAMP_SCROLLS={scrollSharePorridge:"sharePorridge",scrollTravelerSoup:"travelerSoup",scrollFriendRice:"friendRice",scrollRestTea:"restTea"} as const;
export const CAMP_SCROLL_ITEMS=Object.fromEntries(Object.entries(CAMP_SCROLLS).map(([id,d])=>[id,item("scroll",`ม้วนสูตร ${CAMP_ITEMS[d].name.th}`,`Recipe scroll: ${CAMP_ITEMS[d].name.en}`,12,["ม้วนกระดาษมีภาพชามและเชือกผูก","A tied paper scroll with a bowl drawing."],3)])) as Record<keyof typeof CAMP_SCROLLS,Item>;
