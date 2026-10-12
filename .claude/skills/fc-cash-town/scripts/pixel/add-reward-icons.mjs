// Deterministic additions to the town's existing pixel icon system. Keep all previous cells and cursor anchors.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sharp} from './pxlib.mjs';
const path='lib/town/icon-atlas.json',original=readFileSync(path,'utf8'),atlas=JSON.parse(original);
function picture(draw){const buf=Buffer.alloc(32*32*4);const pixel=(x,y,c)=>{if(x>=0&&y>=0&&x<32&&y<32){const n=(y*32+x)*4;buf[n]=parseInt(c.slice(0,2),16);buf[n+1]=parseInt(c.slice(2,4),16);buf[n+2]=parseInt(c.slice(4,6),16);buf[n+3]=255;}};
 const rect=(x,y,w,h,c)=>{for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)pixel(i,j,c);};
 const line=(x,y,a,b,c)=>{const n=Math.max(Math.abs(a-x),Math.abs(b-y));for(let i=0;i<=n;i++)pixel(Math.round(x+(a-x)*i/n),Math.round(y+(b-y)*i/n),c);};draw({pixel,rect,line});return buf;}
const sprites={
 charmChefFlame:picture(({rect,line,pixel})=>{line(7,2,13,12,'847457');line(25,2,19,12,'847457');rect(10,10,13,18,'534132');rect(11,11,11,16,'b68b52');rect(13,13,7,11,'563e36');rect(15,18,4,7,'d2733b');rect(16,14,3,9,'eea453');rect(16,18,2,6,'e9d291');pixel(15,12,'d68a43');rect(10,27,13,2,'7b633e');}),
 thingFlavorBook:picture(({rect,line,pixel})=>{rect(5,5,23,24,'403d32');rect(6,5,3,24,'6b7350');rect(9,6,18,21,'b9b185');rect(10,7,16,18,'e0d6ad');line(13,10,23,10,'8b805b');line(13,12,21,12,'8b805b');rect(13,17,9,6,'719365');rect(14,18,7,4,'aeb87b');rect(16,15,2,3,'8d7548');rect(24,22,2,7,'b97849');line(9,28,23,28,'8a805d');}),
 thingDragonPot:picture(({rect,line,pixel})=>{rect(5,12,23,15,'3e4842');rect(7,13,19,13,'668579');rect(9,14,15,10,'96ac88');rect(11,16,11,6,'bdba87');rect(3,15,4,6,'536d60');rect(27,15,3,6,'536d60');rect(8,9,17,3,'87986e');rect(12,6,9,3,'768566');rect(14,3,5,4,'c3b476');line(6,28,26,28,'533e31');rect(9,28,3,3,'a86438');rect(20,28,3,3,'c38743');line(12,21,19,17,'66866a');line(19,17,23,20,'66866a');pixel(20,18,'e1cf86');}),
 thingWingCrown:picture(({rect,line,pixel})=>{rect(5,21,23,8,'61593a');rect(6,22,21,6,'a9aa6a');rect(8,24,17,2,'d6c790');line(5,21,3,13,'657f61');line(6,21,5,13,'b4c48a');line(27,21,29,13,'657f61');line(26,21,27,13,'b4c48a');rect(8,15,5,7,'658c75');rect(9,16,3,5,'9dc4a0');rect(20,15,5,7,'658c75');rect(21,16,3,5,'9dc4a0');rect(14,10,5,13,'54776b');rect(15,11,3,11,'b6cba2');rect(15,7,3,4,'e1d194');pixel(16,6,'c3d6a4');pixel(4,12,'d1e0ac');pixel(28,12,'d1e0ac');rect(14,23,5,3,'6ba39b');pixel(16,23,'dce7c4');}),
 charmPollenGuardian:picture(({rect,line,pixel})=>{line(7,2,14,12,'8f9b61');line(25,2,18,12,'8f9b61');rect(12,10,9,3,'d4bd79');line(16,13,7,21,'aeb982');line(17,13,26,21,'aeb982');rect(9,16,15,11,'425b47');rect(11,15,11,13,'7b9862');rect(13,17,7,9,'b2c687');rect(15,18,3,7,'e1d5a0');rect(10,20,4,2,'e0c982');rect(20,20,4,2,'e0c982');rect(14,27,5,3,'637a50');pixel(16,14,'e4dd9e');pixel(7,23,'cbd98c');pixel(26,23,'cbd98c');}),
 thingMoonLantern:picture(({rect,line,pixel})=>{rect(12,2,8,2,'c8d0aa');line(11,4,11,9,'668270');line(21,4,21,9,'668270');rect(8,8,17,3,'405f56');rect(9,9,15,2,'9aaf91');rect(8,12,17,15,'314d49');rect(10,13,13,12,'8db5a4');rect(12,14,9,10,'c3d6b0');rect(15,15,3,8,'ede6b5');rect(9,12,2,14,'566d56');rect(22,12,2,14,'566d56');rect(7,26,19,3,'445b4d');rect(10,27,13,2,'93a87e');pixel(16,11,'e6e7b3');}),
 thingTinyForest:picture(({rect,line,pixel})=>{
  rect(11,2,10,4,'675235');rect(12,3,8,2,'b19c6c');rect(10,6,12,3,'7ba79d');rect(6,10,20,17,'2e4d50');rect(7,11,18,15,'789e92');rect(9,27,15,2,'385a53');rect(8,11,2,13,'c2d2b2');rect(22,13,2,11,'9dbdac');
  rect(9,23,14,3,'6a6948');rect(10,23,12,1,'9cad64');line(16,23,16,11,'8a744d');rect(14,12,5,3,'405e43');rect(12,15,9,3,'527743');rect(13,15,6,1,'9bbd70');rect(11,18,11,3,'5c874c');rect(12,18,7,1,'a0c17b');
  line(11,23,11,17,'7e704a');rect(9,18,4,2,'415d3c');rect(8,20,6,2,'7b9e50');line(22,23,22,17,'7e704a');rect(20,18,4,2,'425f53');rect(19,20,6,2,'6b9776');pixel(15,10,'c6d99d');pixel(19,25,'bacc7d');
 }),
 thingCloudJar:picture(({rect,line,pixel})=>{
  rect(10,4,12,3,'514f45');rect(11,4,10,2,'b2bbab');rect(8,9,16,3,'485b58');rect(6,12,20,13,'344e50');rect(7,13,18,11,'749291');rect(8,14,3,8,'a0b9ab');rect(12,25,10,3,'4f6a63');rect(13,27,8,2,'344b44');
  rect(12,15,10,5,'d3ddc2');rect(14,13,6,7,'e4e8cf');rect(11,17,12,2,'a8c1b3');line(13,20,12,23,'72bac0');line(17,20,16,24,'a6d4cb');line(21,20,20,23,'72bac0');rect(9,7,14,3,'8ca99b');pixel(10,9,'c3d3bd');
  line(9,9,4,13,'8d805e');line(4,13,7,21,'8d805e');line(23,9,28,13,'8d805e');line(28,13,25,21,'8d805e');
 }),
 thingSpringStone:picture(({rect,line,pixel})=>{
  rect(5,18,23,10,'3e514a');rect(7,15,20,12,'6e8070');rect(9,12,16,13,'899e81');rect(11,10,11,12,'a8b498');rect(12,10,6,3,'d2d4ac');
  line(16,4,16,20,'c1ddd1');rect(14,5,4,7,'72aeb1');rect(15,6,2,5,'bddccc');rect(12,17,10,3,'3f706e');rect(14,16,5,2,'9cc5af');
  rect(4,27,24,3,'3e5549');rect(6,27,20,2,'7e9b6f');pixel(25,9,'b9d6b5');pixel(27,7,'94b9a3');pixel(29,10,'79a99a');
 }),
 thingRiverHorn:picture(({rect,line,pixel})=>{
  line(4,25,22,8,'455f57');line(5,26,23,9,'baa166');line(6,27,24,10,'dbc58b');rect(2,23,5,6,'7a653e');rect(3,24,3,4,'ceae70');
  rect(19,5,9,5,'7e7b58');rect(20,6,7,3,'cdb57e');rect(24,2,5,9,'425e59');rect(25,3,3,7,'8eac8e');pixel(25,3,'d2e0b3');
  rect(10,14,4,8,'526d5d');rect(11,15,2,6,'b1c3a0');line(13,19,21,25,'b8a16b');line(21,25,27,21,'7aa4a5');pixel(28,18,'a6d5c9');pixel(30,17,'87babe');pixel(29,14,'cae6cd');
 }),
 famWaterRelay:picture(({rect,line,pixel})=>{
  rect(12,3,9,3,'d7ddc1');rect(9,6,15,4,'78b9b6');rect(8,10,17,11,'315d6c');rect(10,10,13,10,'589b9f');
  rect(11,11,3,6,'a3d3c0');rect(12,12,2,2,'e3edce');rect(12,14,2,2,'25444d');rect(20,14,2,2,'25444d');
  line(8,18,3,23,'6fb0b3');line(24,18,28,23,'568f9e');rect(12,22,10,3,'a7d0bb');rect(14,25,6,3,'75aaa5');
  pixel(17,29,'bcddc5');rect(3,26,3,3,'629caf');pixel(4,25,'a8cdbd');rect(27,27,3,2,'629caf');
 }),
 charmDomino:picture(({rect,line,pixel})=>{
  line(6,3,15,14,'a28754');line(26,3,18,14,'a28754');rect(13,12,7,5,'d3b879');
  rect(5,19,7,10,'3d322a');rect(6,20,5,8,'b39262');line(7,22,10,23,'dbc493');
  rect(13,17,7,10,'3d322a');rect(14,18,5,8,'967745');line(15,20,18,21,'ccb67e');
  rect(21,14,7,10,'3d322a');rect(22,15,5,8,'7d6544');line(23,17,26,18,'bea570');
  line(10,29,16,27,'d2b678');line(18,27,25,24,'d2b678');pixel(28,10,'dbc493');pixel(30,12,'dbc493');
 }),
 thingCoreSpade:picture(({rect,line,pixel})=>{
  line(5,28,21,5,'433b31');line(6,28,22,5,'b39869');line(7,28,23,5,'786544');
  rect(17,2,11,4,'3b4649');rect(18,2,9,2,'a9bbb4');rect(17,6,3,6,'798f8e');rect(24,6,3,6,'617775');
  line(18,12,21,16,'acc5bc');line(25,12,22,16,'acc5bc');rect(20,10,4,4,'587b7a');pixel(21,11,'dae3c6');
  rect(3,23,6,6,'6d5340');rect(4,24,4,4,'a7895a');line(12,23,16,29,'a0b4a7');line(17,29,23,23,'a0b4a7');
  rect(13,23,10,7,'394e52');rect(15,24,6,5,'749a96');rect(16,24,2,3,'c0d4b9');pixel(27,19,'d9c695');pixel(29,21,'d9c695');
 }),
 charmListening:picture(({rect,line,pixel})=>{
  line(7,2,15,12,'806b42');line(25,2,18,12,'806b42');rect(12,10,9,3,'d2b46d');
  rect(8,14,17,12,'413d2c');rect(10,13,13,15,'8d7446');rect(12,14,9,13,'c4a573');
  line(13,15,15,20,'705338');line(15,20,13,25,'705338');line(19,15,17,20,'705338');line(17,20,19,25,'705338');
  rect(15,17,3,6,'658654');pixel(16,18,'ccdd9e');rect(14,27,5,3,'684f33');
  pixel(6,17,'8daf6c');pixel(4,20,'b7c686');pixel(27,18,'8daf6c');pixel(29,21,'b7c686');
 }),
 famForestGuardian:picture(({rect,line,pixel})=>{
  // A rooted woodland companion: complete pixel silhouette, warm bark and shaded leaf crown.
  line(9,10,5,3,'504631');line(22,10,26,3,'504631');line(5,6,2,4,'8ba961');line(25,6,29,4,'8ba961');
  rect(7,7,19,4,'354e38');rect(9,4,15,4,'527d49');rect(12,2,8,3,'7eaa61');rect(10,6,8,2,'a2c078');
  rect(8,11,17,12,'514533');rect(10,10,13,13,'927048');rect(11,11,3,8,'b49761');rect(19,12,4,9,'685333');
  rect(12,13,3,3,'353d32');rect(19,13,3,3,'353d32');pixel(13,14,'e5d597');pixel(20,14,'e5d597');
  line(15,20,19,20,'544432');rect(10,22,14,5,'5c7650');rect(11,23,4,3,'87a465');rect(18,23,4,3,'425b3f');
  line(11,26,6,29,'745938');line(12,27,11,30,'967a4e');line(21,26,26,29,'745938');line(20,27,21,30,'967a4e');
  line(9,19,5,24,'745938');line(23,19,27,24,'745938');rect(4,22,4,3,'739256');rect(25,22,4,3,'739256');
 }),
 thingSchoolBell:picture(({rect,line,pixel})=>{
  rect(14,2,5,4,'584333');rect(15,3,3,2,'d5c293');line(8,8,16,4,'677a68');line(16,4,24,8,'677a68');rect(13,7,7,4,'b8984b');rect(10,11,13,7,'ccab59');rect(8,17,17,6,'dbbd6b');rect(6,23,21,3,'584734');rect(7,23,19,2,'e2ca83');rect(14,26,6,3,'816737');
  line(3,9,1,14,'80a5af');line(29,9,31,14,'80a5af');rect(2,26,5,3,'79a6a8');pixel(1,25,'466e76');pixel(1,29,'466e76');pixel(5,26,'d1dba9');rect(25,3,4,2,'afc9b7');pixel(29,2,'afc9b7');pixel(29,5,'afc9b7');
 }),
 thingTreeHive:picture(({rect,line,pixel})=>{
  rect(3,7,26,4,'3f3227');rect(4,7,24,2,'956e47');line(8,9,12,14,'715332');rect(9,13,15,3,'d7b564');rect(7,16,19,4,'c6a354');rect(6,20,21,4,'dabb70');rect(9,24,16,4,'be9046');rect(11,28,11,2,'6a4b2c');rect(13,21,7,5,'4a3627');rect(15,22,3,3,'2b302a');
  rect(23,3,5,3,'eed48f');rect(25,3,1,3,'493b2b');pixel(22,3,'e2edd0');pixel(27,2,'e2edd0');rect(1,17,4,3,'94ba64');line(3,17,4,12,'52733d');
 }),
 thingCrystalRepair:picture(({rect,line,pixel})=>{
  rect(3,20,26,9,'51443d');rect(4,21,24,6,'926c45');rect(5,22,5,4,'c9a676');rect(13,22,12,2,'604b35');
  line(5,18,17,5,'879ba6');line(6,18,18,5,'d5ddd0');rect(14,3,9,4,'586e78');rect(15,3,7,2,'a8bfc1');
  rect(19,11,9,8,'434356');rect(20,12,7,7,'8c75a9');rect(21,13,4,5,'c1a9d0');rect(23,13,2,3,'e0d5df');pixel(27,9,'e2d4a0');pixel(29,11,'e2d4a0');line(10,18,15,15,'bdab76');
 }),
 charmGemColor:picture(({rect,line,pixel})=>{
  line(4,4,16,14,'886b45');line(16,14,28,4,'886b45');line(5,4,16,12,'d8b877');line(16,12,27,4,'d8b877');
  for(let y=12;y<29;y++)for(let x=7;x<26;x++){const d=(x-16)**2+(y-20)**2;if(d<75&&d>44)pixel(x,y,d>63?'52403c':'d1af68');}
  rect(13,15,7,10,'3a3347');rect(14,16,5,3,'c76d72');rect(14,19,5,3,'7499c7');rect(14,22,5,2,'d0b76e');pixel(15,17,'f1bbac');pixel(18,23,'f3d88b');rect(15,28,3,3,'d1af68');
 }),
 thingForestRing:picture(({rect,line,pixel})=>{
  for(let y=5;y<29;y++)for(let x=4;x<28;x++){const d=(x-16)**2+(y-17)**2;if(d>=62&&d<=118)pixel(x,y,d>=105?'394b31':d<=76?'775e36':'cfaf60');}
  line(9,21,8,9,'667e42');line(8,9,13,5,'91bd65');rect(6,10,4,3,'547c43');rect(9,7,5,3,'a9d483');rect(13,3,6,5,'394b31');rect(14,4,4,4,'a6da8f');pixel(15,4,'e9efaa');
  line(24,22,27,12,'557340');rect(23,12,5,3,'8fbd68');rect(23,23,3,3,'e1c88b');pixel(5,4,'a6da8f');pixel(3,6,'a6da8f');
 }),
 thingStarBottle:picture(({rect,line,pixel})=>{
  rect(12,2,8,4,'4d382a');rect(13,3,6,2,'b39057');rect(11,6,10,3,'617b91');rect(7,10,18,18,'304655');rect(8,11,16,16,'50838c');rect(9,12,3,12,'84b8b0');rect(10,14,2,5,'bfdfca');
  rect(10,27,13,2,'2c3f4b');rect(13,7,6,3,'abc7b5');line(12,10,8,13,'91b7b2');line(20,10,24,13,'91b7b2');
  rect(16,14,2,10,'f1d884');rect(12,18,10,2,'f1d884');rect(14,16,6,6,'dcb869');rect(16,17,3,3,'fff1c0');pixel(22,9,'f1d884');pixel(25,5,'f1d884');pixel(27,8,'b8d2b6');
 }),
 charmBranchVein:picture(({rect,line,pixel})=>{
  line(8,2,8,12,'3c3432');line(24,2,24,12,'3c3432');line(8,12,16,18,'ba9857');line(24,12,16,18,'ba9857');
  rect(14,15,5,5,'d7b86b');line(16,19,9,27,'7bb7b3');line(17,19,24,27,'b9a3d7');
  rect(5,23,8,6,'364957');rect(6,24,6,4,'72a6b3');rect(7,24,3,2,'c4dddd');
  rect(21,23,7,6,'463651');rect(22,24,5,4,'a389bc');pixel(24,25,'efe0ef');rect(14,21,5,9,'4c4338');rect(15,22,3,7,'9a7a4c');
 }),
 thingPocketLift:picture(({rect,line,pixel})=>{
  rect(4,4,24,3,'3d4148');rect(6,5,20,1,'b9c7c7');rect(5,7,3,22,'73624c');rect(24,7,3,22,'73624c');
  line(8,7,23,27,'c2a66c');line(23,7,8,27,'c2a66c');rect(7,20,18,7,'3b4b52');rect(8,21,16,5,'a27745');
  rect(10,16,3,5,'849a9f');rect(19,16,3,5,'849a9f');rect(11,25,11,2,'d2b36d');rect(13,8,6,5,'3d4148');rect(14,9,4,3,'d4c390');
  line(16,13,16,20,'c9cfbd');rect(2,28,28,3,'3e3932');pixel(15,10,'f1e8c0');
 }),
 thingPocketSawmill:picture(({rect,line})=>{
  rect(3,24,26,3,'3b302d');rect(5,26,3,4,'9b7648');rect(24,26,3,4,'9b7648');rect(6,18,20,6,'bc894e');rect(7,19,19,2,'e2b571');
  rect(6,4,3,16,'343941');rect(8,4,18,3,'343941');rect(24,5,3,16,'343941');rect(9,7,14,2,'d5e2df');line(10,9,21,17,'a0c6cb');
  rect(11,20,10,2,'4e3b2c');rect(26,15,4,3,'d6b15b');rect(28,17,2,4,'776241');
 }),
 famDwarf:picture(({rect,pixel,line})=>{
  rect(11,4,11,4,'3b4b60');rect(9,7,15,4,'526e83');rect(11,8,3,2,'8caeba');rect(16,6,5,4,'413d31');rect(17,7,3,2,'e6c167');
  rect(11,11,12,9,'d9a57e');rect(13,13,2,2,'38353e');rect(20,13,2,2,'38353e');rect(11,16,12,7,'f0dbb3');rect(14,20,7,4,'e1c79e');pixel(17,16,'945d49');
  rect(10,21,14,7,'49646f');rect(9,23,3,4,'bb9c73');rect(22,23,3,4,'bb9c73');rect(12,27,4,3,'494039');rect(20,27,4,3,'494039');rect(16,23,4,2,'bc904b');
  line(5,26,10,11,'92673b');line(3,12,12,9,'677d86');line(12,9,14,12,'acc1c3');pixel(4,4,'cab78b');pixel(3,5,'cab78b');pixel(5,5,'cab78b');
 }),
 thingOreCompass:picture(({rect,line,pixel})=>{
  rect(13,2,6,5,'33241f');rect(14,3,4,3,'d1a052');
  for(let y=6;y<29;y++)for(let x=4;x<28;x++){const d=(x-15.5)**2+(y-17)**2;if(d<=125)pixel(x,y,d>91?'382b2c':d>67?'ce9853':'e8d8aa');}
  line(15,8,15,25,'b69c73');line(7,17,24,17,'b69c73');
  for(let n=0;n<8;n++){line(16-n/3,16+n,16,9+n,'9baed0');line(16+n/3,16-n,16,24-n,'b54644');}
  rect(15,16,3,3,'493c34');pixel(16,16,'f4eac2');rect(23,14,5,6,'3e3b38');rect(24,15,3,4,'b3d8db');
 }),
 famBeaver:picture(({rect,line,pixel})=>{
  rect(20,22,10,6,'44352f');rect(21,23,8,4,'7a604a');for(let i=0;i<4;i++)line(22+i*2,23,24+i*2,26,'544335');rect(5,11,17,16,'523827');rect(6,12,15,14,'9b704d');rect(8,15,11,11,'b78b60');rect(4,8,5,5,'62412d');rect(17,8,5,5,'62412d');rect(7,10,12,12,'a97c53');rect(9,13,2,3,'302821');rect(16,13,2,3,'302821');rect(11,17,5,2,'3c2e26');rect(12,19,2,3,'ead9b5');rect(15,19,2,3,'ead9b5');rect(6,25,4,4,'503729');rect(17,25,4,4,'503729');pixel(9,13,'ddd4bc');pixel(16,13,'ddd4bc');
 }),
 thingBeetleRing:picture(({rect,line,pixel})=>{
  for(let y=8;y<27;y++)for(let x=2;x<30;x++){const d=((x-16)/14)**2+((y-17)/9)**2;if(d<1)pixel(x,y,d>.84?'493a29':d>.6?'bc9863':'526e44');}line(5,25,27,25,'473b2c');line(8,27,24,27,'9b794b');for(const x of [10,21]){rect(x-2,14,5,8,'28332e');rect(x-1,15,3,6,x<15?'c0a267':'7eaa83');rect(x-1,11,3,4,'3a4030');line(x-4,16,x+5,16,'30372d');line(x-4,19,x+5,19,'30372d');line(x-1,11,x-3,9,'c1b682');line(x+1,11,x+3,9,'c1b682');pixel(x,15,'e2d69b');}
 }),
 famRiverDragon:picture(({rect,line,pixel})=>{
  const spots=[[7,24],[12,26],[17,25],[20,22],[20,18],[17,16],[13,17],[10,18],[8,15],[10,12],[15,11],[21,11]];for(const [x,y]of spots){rect(x-3,y-3,6,6,'294f57');rect(x-2,y-2,4,4,'58969b');pixel(x-1,y-2,'a7d3bd');pixel(x+1,y+1,'3d727d');}line(5,24,2,21,'60969b');line(11,10,8,7,'bdc595');line(18,8,17,3,'bdc595');line(25,8,28,4,'bdc595');rect(17,7,12,7,'305863');rect(18,8,10,5,'73a9a4');rect(25,10,5,3,'91b6a5');rect(20,8,2,2,'d2d099');pixel(21,8,'252e35');line(24,13,28,16,'d2d099');line(18,13,18,17,'c0c897');rect(12,23,2,3,'c7c69b');rect(19,18,2,3,'c7c69b');pixel(3,27,'547a83');pixel(27,23,'8bb8ad');
 }),
 thingLotusBoat:picture(({rect,line,pixel})=>{
  for(let y=8;y<28;y++)for(let x=2;x<30;x++){const d=((x-16)/14)**2+((y-18)/9)**2;if(d<1)pixel(x,y,d>.76?'335847':d>.42?'68955c':'9daf70');}
  line(4,18,27,18,'c3ce91');line(15,18,10,10,'b4c388');line(15,18,23,11,'b4c388');line(15,18,9,25,'b4c388');line(15,18,24,24,'b4c388');for(let i=0;i<5;i++){rect(10+i*3,14,2,9,i%2?'82734b':'a08b58');}line(3,26,26,5,'423c30');line(4,26,27,5,'ba9b68');rect(24,3,5,6,'83613c');rect(25,4,3,4,'c1a571');
 }),
 charmLunarReel:picture(({rect,line,pixel})=>{
  line(8,2,14,9,'777361');line(25,2,20,9,'777361');rect(6,9,21,20,'303b43');rect(8,10,17,17,'799ba6');rect(9,11,15,15,'bed6d4');rect(10,12,13,13,'416377');rect(14,13,7,11,'dfddbc');rect(17,12,5,9,'416377');rect(12,20,5,3,'e5e7cf');rect(15,22,4,2,'e5e7cf');rect(5,23,5,4,'353d43');line(8,25,3,29,'b9bd9d');rect(1,27,4,4,'72888b');pixel(12,14,'e7f0db');rect(14,28,6,2,'aababc');
 }),
 charmTreePact:picture(({rect,line,pixel})=>{
  line(8,3,15,13,'584b35');line(24,3,17,13,'584b35');rect(10,11,13,17,'423c2c');rect(11,12,11,15,'7c9b61');rect(12,13,9,13,'b3c18b');
  rect(15,20,3,6,'756042');line(16,20,11,16,'4c7251');line(17,19,21,15,'4c7251');rect(9,14,5,3,'517b55');rect(19,13,5,3,'517b55');rect(14,13,5,3,'6d8c50');pixel(12,14,'d4dfac');pixel(20,14,'d4dfac');rect(14,28,6,2,'5d533d');
 }),
 famGardenMender:picture(({rect,line,pixel})=>{
  rect(5,12,6,8,'5a7777');rect(22,12,6,8,'5a7777');rect(6,13,4,5,'b6d3bd');rect(23,13,4,5,'b6d3bd');rect(11,6,12,11,'41594d');rect(12,7,10,10,'b8c395');rect(14,10,2,2,'344838');rect(20,10,2,2,'344838');pixel(17,14,'648056');rect(12,17,11,10,'5b8b68');rect(14,18,7,8,'a0bc82');rect(12,26,4,3,'4e6954');rect(20,26,4,3,'4e6954');line(10,4,16,8,'597c4b');rect(7,2,6,4,'91ac66');line(24,24,29,19,'aa8b53');rect(26,17,5,4,'7897a0');pixel(27,17,'d6e1c3');
 }),
 thingReviveSeed:picture(({rect,line,pixel})=>{
  rect(8,18,17,11,'4b4938');rect(9,19,15,9,'998b5a');rect(12,20,9,8,'d2b776');rect(13,21,7,6,'e6d193');line(16,21,17,9,'557542');line(17,10,10,6,'557542');line(17,13,24,7,'557542');rect(5,4,8,5,'405f39');rect(6,4,7,3,'99b66b');rect(22,5,7,5,'405f39');rect(22,5,6,3,'99b66b');pixel(7,4,'cbd29a');pixel(23,5,'cbd29a');line(17,24,15,29,'967747');line(17,25,21,29,'967747');
 }),
 thingCampFlag:picture(({rect,line,pixel})=>{
  rect(6,2,3,28,'4a3c2e');rect(7,3,1,25,'b29b6a');rect(9,5,19,3,'354b4b');rect(9,8,18,7,'5f9289');rect(9,15,15,4,'416e68');rect(10,7,14,2,'a8c7a2');line(13,12,18,9,'e0d49a');line(18,9,23,12,'e0d49a');line(14,12,18,16,'e0d49a');line(18,16,22,12,'e0d49a');rect(3,29,11,2,'514332');pixel(8,2,'ddd2a7');
 }),
 charmWaykeeper:picture(({rect,line,pixel})=>{
  line(6,2,15,11,'7d7254');line(27,2,18,11,'7d7254');rect(14,9,6,4,'d3bf7e');for(let y=12;y<29;y++)for(let x=7;x<27;x++){const d=((x-17)/10)**2+((y-19)/11)**2;if(d<1&&y<30-Math.abs(x-17)/2)pixel(x,y,d>.7?'344b50':x<17?'a3c9bb':'628e87');}line(16,26,17,15,'d2d3a0');line(17,18,12,15,'d2d3a0');line(17,21,23,17,'d2d3a0');rect(11,13,4,3,'e3d7a4');rect(21,15,4,3,'e3d7a4');pixel(16,13,'f2e8bf');
 }),
 thingGiantSeeds:picture(({rect,line,pixel})=>{
  rect(6,9,21,20,'4c4130');rect(7,10,19,18,'bc9e69');rect(8,11,17,5,'ddc495');line(9,18,24,18,'816641');rect(11,20,11,6,'648348');rect(12,19,9,7,'91a85b');rect(14,18,5,9,'b4bc76');pixel(15,20,'e0d79b');line(17,17,19,12,'517240');rect(18,11,6,3,'738f4e');rect(10,3,4,6,'77512e');rect(11,4,2,4,'c5a66b');rect(19,3,4,6,'77512e');rect(20,4,2,4,'c5a66b');
 }),
 thingCrossBrush:picture(({rect,line,pixel})=>{
  line(5,27,23,9,'3b392d');line(6,28,24,10,'a58a51');line(7,28,25,10,'d2b879');rect(20,7,7,6,'544b34');rect(21,6,6,5,'b4c794');rect(24,3,5,5,'dcdbaa');pixel(27,3,'f1e8c3');rect(4,7,6,5,'658747');rect(11,4,6,5,'a9aa62');line(8,12,12,17,'88a65b');line(14,9,12,17,'88a65b');pixel(12,14,'d4cf91');
 }),
 thingPollenSeal:picture(({rect,line,pixel})=>{
  rect(12,3,9,4,'66523b');rect(13,3,7,2,'b79356');rect(10,8,13,20,'46584e');rect(11,9,11,17,'82a795');rect(12,11,2,12,'c2dac0');rect(15,16,6,8,'d7bd68');rect(16,17,4,6,'efe0a0');rect(12,27,9,2,'384b44');for(const [x,y]of [[4,10],[7,6],[25,15],[27,7]]){pixel(x,y,'e3d592');pixel(x+1,y+1,'abbd75');}line(6,27,11,22,'8f7948');rect(3,25,6,5,'644b35');rect(4,26,4,3,'c7ac69');
 }),
 thingSkyBean:picture(({rect,line,pixel})=>{
  rect(4,26,24,4,'66513a');rect(6,25,20,2,'a88b59');line(15,26,17,5,'467049');line(16,26,18,5,'91ac6c');for(const [x,y]of [[12,21],[18,17],[12,12],[18,7]]){rect(x,y,7,3,'507c4d');rect(x+1,y,5,2,'a4bd76');}rect(11,5,4,7,'345544');rect(12,5,2,6,'89ae65');rect(22,12,4,9,'345544');rect(23,12,2,8,'89ae65');rect(14,2,9,3,'d3d6bc');pixel(13,3,'d3d6bc');pixel(24,3,'d3d6bc');
 }),
 thingPicnicCloth:picture(({rect,line,pixel})=>{
  rect(3,9,26,18,'584c38');rect(4,10,24,16,'d1c79b');for(let x=0;x<6;x++)for(let y=0;y<4;y++)if((x+y)%2)rect(4+x*4,10+y*4,4,4,'78816a');for(let x=5;x<29;x+=3){rect(x,27,1,3,'b4a776');}for(const x of [9,21])for(const y of [15,23]){rect(x-3,y-1,6,3,'534a35');rect(x-3,y-2,6,2,'e1d6b3');rect(x-2,y-2,4,1,'a67a48');pixel(x,y-4,'e0d9bf');}
 }),
 thingForesterKnife:picture(({rect,line,pixel})=>{
  line(4,26,20,10,'302f31');line(5,27,21,11,'302f31');line(6,28,22,12,'302f31');
  for(let n=0;n<10;n++){line(5+n,26-n,7+n,26-n,'9a623c');pixel(6+n,25-n,'d19e61');}
  line(14,16,19,21,'35352e');line(14,15,20,21,'d5b674');
  for(let y=3;y<18;y++)for(let x=16;x<29;x++){if(x+y>=28&&x+y<=33&&x-y>=5)pixel(x,y,x+y===28?'f7efe0':x+y===33?'546572':'a7bec7');}
  line(19,14,27,6,'dae5d9');rect(3,7,7,10,'513626');rect(4,8,2,8,'9a6c40');rect(8,9,2,6,'b39158');line(3,7,7,4,'436b40');line(7,4,11,7,'7f9d52');
 })
};
mkdirSync('public/town/rewards',{recursive:true});
const entries=Object.entries(sprites),raw=await sharp(`public${atlas.image}`).ensureAlpha().raw().toBuffer(),[w,h]=atlas.size,columns=Math.floor(w/34),addedHeight=Math.ceil(entries.length/columns)*34,canvas=Buffer.alloc(w*(h+addedHeight)*4);raw.copy(canvas);
if(entries.every(([id])=>atlas.icons[id])){console.log('All reward icons are already registered.');process.exit(0);}
for(let i=0;i<entries.length;i++){const [id,buf]=entries[i];await sharp(buf,{raw:{width:32,height:32,channels:4}}).png().toFile(`public/town/rewards/${id}-v1.png`);const x=1+(i%columns)*34,y=h+1+Math.floor(i/columns)*34;for(let r=0;r<32;r++)buf.copy(canvas,((y+r)*w+x)*4,r*32*4,(r+1)*32*4);atlas.icons[id]=[x,y,32,32];}
const png=await sharp(canvas,{raw:{width:w,height:h+addedHeight,channels:4}}).png({compressionLevel:9}).toBuffer(),hash=createHash('sha256').update(png).digest('hex').slice(0,12);
if(readFileSync(path,'utf8')!==original)throw Error('The shared atlas changed; rerun on its current version');
atlas.image=`/town/icons-${hash}.png`;atlas.size=[w,h+addedHeight];writeFileSync(`public${atlas.image}`,png);writeFileSync(path,JSON.stringify(atlas,null,2)+'\n');
console.log(`Registered ${entries.map(([id])=>id).join(', ')}; preserved ${Object.keys(atlas.icons).length-entries.length} previous icons.`);
