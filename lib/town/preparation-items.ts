import type { Dish, Item, Make } from "./items";

const item=(kind:Item["kind"],th:string,en:string,pays:number,look:[string,string],tier:2|3=2):Item=>({kind,tier,name:{th,en},about:{th:look[0],en:look[1]},stack:kind==="tool"?1:20,pays});
export const PREP_ITEMS={
 dicedRoot:item("staple","ผักรากหั่นเต๋า","Diced roots",8,["ชิ้นผักสีส้มและครีมขนาดเท่ากัน","Even orange and cream vegetable cubes."]),
 emberRice:item("staple","ข้าวคั่วเมล็ดสน","Pine toasted rice",9,["เมล็ดข้าวสีทองคลุกเมล็ดสนในถ้วย","Golden rice mixed with pine kernels in a bowl."]),
 brownedOnion:item("staple","หอมเจียวสีทอง","Golden onion",10,["ชิ้นหอมสีทองบางๆ","Thin golden onion pieces."]),
 driedZest:item("staple","ผิวผลไม้แห้ง","Dried zest",10,["แถบผิวผลไม้สีส้มม้วนเล็กๆ","Small curled orange strips."]),
 crushedHerb:item("staple","สมุนไพรบด","Crushed herbs",10,["ใบเขียวบดหยาบในถ้วย","Coarsely crushed green leaves in a bowl."]),
 fishStock:item("staple","น้ำต้มปลาใส","Clear fish stock",13,["น้ำสีอ่อนใสในขวด","Pale clear broth in a bottle."]),
 roastedSeed:item("staple","เมล็ดคั่ว","Roasted seeds",12,["เมล็ดเล็กสีน้ำตาลมีรอยเข้ม","Small brown seeds with dark marks."]),
 whiskedEgg:item("staple","ไข่ตีฟู","Whisked egg",12,["ไข่สีเหลืองมีฟองเล็กในถ้วย","Yellow egg with small bubbles in a bowl."]),
 fragrantOil:item("staple","น้ำมันหอมสมุนไพร","Herb oil",18,["น้ำมันสีทองมีใบเขียวอยู่ในขวด","Golden oil with green leaves in a bottle."]),
 smokedSalt:item("staple","เกลือรมควัน","Smoked salt",17,["ผลึกเกลือสีเทาอ่อนในถ้วย","Pale grey salt crystals in a bowl."]),
 fermentStarter:item("staple","หัวเชื้อหมัก","Ferment starter",20,["เนื้อสีครีมมีฟองในโถ","Cream coloured bubbles in a crock."],3),
 brightSauce:item("staple","ซอสผลไม้สีอำพัน","Amber fruit sauce",22,["ซอสสีส้มอำพันในขวดสั้น","Amber orange sauce in a short bottle."],3),
 thickBroth:item("staple","น้ำซุปเคี่ยวข้น","Reduced broth",22,["น้ำซุปสีน้ำตาลข้นในถ้วย","Thick brown broth in a bowl."],3),
 sweetGlaze:item("staple","เคลือบหวาน","Sweet glaze",23,["น้ำหวานเหนียวสีทองในโถ","Thick golden syrup in a jar."],3),
 spicePaste:item("staple","เครื่องเทศตำ","Spice paste",24,["เนื้อบดสีแดงเข้มในถ้วยเล็ก","Dark red paste in a small bowl."],3),
 prepBoard:item("tool","เขียงเตรียมวัตถุดิบ","Preparation board",31,["เขียงไม้มีมีดสั้นวางข้างๆ","A wooden board beside a short knife."]),
 tastingSpoon:item("tool","ช้อนชิม","Tasting spoon",32,["ช้อนไม้ปลายกลมขนาดเล็ก","A small round ended wooden spoon."]),
 scentLid:item("tool","ฝาครอบกลิ่น","Scent lid",34,["ฝาโค้งมีหูจับและรูเล็กบนยอด","A domed lid with a handle and a small vent."]),
 heatBell:item("tool","กระดิ่งเตา","Stove bell",35,["กระดิ่งทองแดงบนขาไม้","A copper bell on a wooden support."]),
 fermentCrock:item("tool","ไหหมัก","Ferment crock",38,["ไหดินปิดฝา ผูกผ้ารอบปาก","A lidded clay crock with cloth around the rim."],3),
 cookTimer:item("tool","นาฬิกาครัว","Kitchen timer",36,["นาฬิกาไม้ทรงกลมมีเข็มสั้น","A round wooden dial with a short hand."],3),
 layeredRootPot:item("dish","หม้อผักรากเรียงชั้น","Layered root stew",33,["ชิ้นผักหลายสีเรียงในน้ำซุป","Colourful vegetable layers in broth."],3),
 crispRiceSkillet:item("dish","ข้าวกระทะกรอบ","Crisp skillet rice",34,["ข้าวสีทองมีขอบเข้มในชาม","Golden rice with a dark rim in a bowl."],3),
 slowFishBroth:item("dish","ซุปปลาเคี่ยวช้า","Slow fish broth",36,["เนื้อปลาสีขาวในซุปสีน้ำตาลอ่อน","White fish in light brown broth."],3),
 glazedForestBowl:item("dish","ข้าวป่าเคลือบหอม","Glazed forest bowl",37,["ข้าวกับเห็ดมันวาวและใบเขียว","Rice with glossy mushrooms and green leaves."],3),
} as const;
export const PREP_TOOLS=["prepBoard","tastingSpoon","scentLid","heatBell","fermentCrock","cookTimer"] as const;
export const PREP_MAKES={
 dicedRoot:{needs:[["carrot",2],["daikon",1]],in:["cleaver"],gives:2},
 emberRice:{needs:[["rice",2],["pineNut",1]],in:["pan"],gives:2},
 brownedOnion:{needs:[["scallion",2]],in:["pan"],gives:2},
 driedZest:{needs:[["lime",2]],in:["pan"],gives:2},
 crushedHerb:{needs:[["waterMint",2]],in:["mortar"],gives:2},
 fishStock:{needs:[["minnow",2],["clearSpring",1]],in:["pot"],gives:2},
 roastedSeed:{needs:[["berryPip",2]],in:["pan"],gives:2},
 whiskedEgg:{needs:[["egg",2]],in:["jar"],gives:2},
 fragrantOil:{needs:[["crushedHerb",2],["berrySeedOil",1]],in:["pot"],gives:2},
 smokedSalt:{needs:[["springSalt",2],["charcoal",1]],in:["pan"],gives:2},
 fermentStarter:{needs:[["sporeCulture",1],["rice",2]],in:["fermentCrock"],gives:2},
 brightSauce:{needs:[["driedZest",1],["wildStrawberry",2],["sugar",1]],in:["pot"],gives:2},
 thickBroth:{needs:[["fishStock",2],["brownedOnion",1]],in:["pot"],gives:2},
 sweetGlaze:{needs:[["brightSauce",1],["sugar",2]],in:["pot"],gives:2},
 spicePaste:{needs:[["crushedHerb",1],["chili",2],["fragrantOil",1]],in:["mortar"],gives:2},
} satisfies Record<string,Make>;
export const PREP_CRAFTS={
 prepBoard:[["splitPlank",2],["oreIron",1]],tastingSpoon:[["heartwood",1],["petalDye",1]],
 scentLid:[["oreCopper",3],["resin",1]],heatBell:[["oreCopper",2],["oreSilver",1],["reedPith",1]],
 fermentCrock:[["wetClay",5],["sporeCulture",1],["silkenCord",1]],cookTimer:[["splitPlank",2],["oreCopper",2],["crystalLens",1]],
} as const;
export const PREP_DISHES={
 layeredRootPot:{stamina:35,buff:"seasoning",recipe:{needs:[["dicedRoot",2],["thickBroth",1],["spicePaste",1]],in:["pot"],serves:3,cooks:1}},
 crispRiceSkillet:{stamina:36,buff:"seasoning",recipe:{needs:[["emberRice",2],["whiskedEgg",1],["smokedSalt",1],["roastedSeed",1]],in:["pan"],serves:3,cooks:1}},
 slowFishBroth:{stamina:38,buff:"seasoning",recipe:{needs:[["thickBroth",2],["fragrantOil",1],["fermentStarter",1]],in:["pot"],serves:3,cooks:1}},
 glazedForestBowl:{stamina:40,buff:"seasoning",recipe:{needs:[["emberRice",2],["shiitake",2],["sweetGlaze",1]],in:["pan"],serves:3,cooks:1}},
} satisfies Record<string,Dish>;
export type PrepDishId=keyof typeof PREP_DISHES;
export const PREP_SCROLLS={scrollLayeredRootPot:"layeredRootPot",scrollCrispRiceSkillet:"crispRiceSkillet",scrollSlowFishBroth:"slowFishBroth",scrollGlazedForestBowl:"glazedForestBowl"} as const;
export const PREP_SCROLL_ITEMS=Object.fromEntries(Object.entries(PREP_SCROLLS).map(([id,d])=>[id,item("scroll",`ม้วนสูตร ${PREP_ITEMS[d].name.th}`,`Recipe scroll: ${PREP_ITEMS[d].name.en}`,12,["ม้วนกระดาษมีภาพชามและตัวเขียนเล็กๆ","A paper scroll with a bowl drawing and small writing."],3)])) as Record<keyof typeof PREP_SCROLLS,Item>;
