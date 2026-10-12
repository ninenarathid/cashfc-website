import type { ItemId,FishId,BaitId } from "./items";
import type { GrainQuality, WoodPart } from "./wood-grain";
export interface ProfessionRewards {warmJob?:import('./private/combo-warm').WarmJob|null}
export interface ProfessionRewards {bugApproach?:import('./bug-approach').BugApproach|null;rowStart?:{key:string;until:number;loadout:string}|null}
export interface ProfessionRewards {secretPart?:import('./private/combo-forest').SecretPartRead|null}
export interface RewardReply {arena?:import("./reward-arena").ArenaRun|null;arenaScore?:number;knownBeetles?:import("./reward-arena").RingBeetle[];boat?:import('./lotus-boats').LotusBoat}
export interface RewardReply {revive?:import('./reward-help').ReviveRun|null;helpPassed?:boolean;helpDone?:string}
export interface RewardReply {camps?:import('./camps').FieldCamp[]}
export interface RewardReply {rainCare?:import('./reward-rain').RainCareRun|null;rainPassed?:boolean}
export interface ProfessionRewards {rainCare?:import('./reward-rain').RainCareRun|null}
export interface ProfessionRewards {gardenRetry?:import('./reward-garden-retry').GardenRetryRun|null}
export interface ProfessionRewards {rowContinuation?:import('./private/combo-rows').RowContinuation|null}
export interface ProfessionRewards {rootSource?:import('./reward-root-extraction').RootSource|null;rootRun?:import('./reward-root-extraction').RootRun|null}
export interface RewardReply {rootRun?:import('./reward-root-extraction').RootRun|null;rootPassed?:boolean}
export interface RewardReply {rowContinuation?:import('./private/combo-rows').RowContinuation|null}
export interface RewardReply {gardenRetry?:import('./reward-garden-retry').GardenRetryRun|null;gardenRetryPassed?:boolean}
export interface RewardReply {rescue?:import('./reward-rescue').RescueRun|null;rescuePassed?:boolean;rescueOffers?:import('./reward-rescue').RescueOffer[]}
export interface ProfessionRewards {rescue?:import('./reward-rescue').RescueRun|null;rescueTicket?:import('./reward-rescue').RescueTicket|null}
export interface ProfessionRewards {failedGarden?:import('./help-checkpoints').FailedGardenJob[];revive?:import('./reward-help').ReviveRun|null}
export interface ProfessionRewards {arena?:import("./reward-arena").ArenaRun|null;arenaBook?:Partial<Record<import("./reward-arena").RingBeetle,number>>;dragon?:import("./reward-dragon").DragonCall|null;boat?:{owner:string;until:number}|null}

export type ScanDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "here";
export interface ExtractionSource { key: string; tree: number; at: [number, number]; quality: GrainQuality; excluded: WoodPart; until: number }
export interface ExtractionRun { id: string; source: string; tree: number; part: "bark" | "sap" | "seed"; seed: number; at: [number, number]; began: number; until: number }
export type TrailKind="forest"|"star"|"dragon";
export interface TrailNode { at:[number,number]; game:"memory"|"order"|"timing"; seed:number }
export interface RewardTrail { id:string; kind:TrailKind; dragon?:Omit<import("./reward-dragon").DragonCall,"until">; nodes:TrailNode[]; next:number; began:number; challenge?:{id:string;began:number;until:number}|null }
export type ResourceKind="hive"|"repair"|"color"|"branch";
export interface ResourceRun {id:string;kind:ResourceKind;recipe:string;at:[number,number];node:TrailNode;began:number;until:number;loadout?:string;correctionUsed?:boolean;source?:string}
export interface VeinSite {key:string;floor:number;at:[number,number];day:number}
export interface BranchSource extends VeinSite {seed:number;ore:ItemId|null;crystal:ItemId|null;until:number}
export interface SchoolCall {fish:FishId;left:number;until:number}
export interface LiftJourney {id:string;floor:number;at:[number,number];day:number;issued:number}
export type CoreRoute="ore"|"crystal"|"safe";
export interface CoreRoom {route:CoreRoute;mineral:ItemId;node:TrailNode;challenge:{id:string;began:number;until:number}|null}
export interface CoreRun {id:string;floor:number;seed:number;began:number;next:number;known:ItemId[];room:CoreRoom|null}
export interface ConduitRun {id:string;at:[number,number];bed:number;seed:number;began:number;until:number;roots:{key:string;identity:string}[]}
export interface WaterRelay {from?:[number,number];sentAt?:number;item:ItemId;at:[number,number];water:number;kind?:import("./waters").Nature|null;hands?:string[]}
export interface CloudRun {id:string;at:[number,number];beds:number[];roots:{key:string;identity:string}[];seed:number;kind:import("./waters").Nature;began:number;until:number}
export interface PactRun {id:string;tree:number;part:"bark"|"sap"|"seed"|"root";at:[number,number];seed:number;began:number;until:number}
export interface NurseryRun {id:string;at:[number,number];kinds:string[];seed:number;next:number;began:number;part?:WoodPart|null;challenge?:{id:string;began:number;until:number}|null}
export interface ProfessionRewards {pact?:PactRun|null;treeKinds?:string[];nursery?:NurseryRun|null;cloud?:CloudRun|null;conduit?:ConduitRun|null;relay?:WaterRelay|null;core?:CoreRun|null; minerals?: ItemId[]; extraction?: ExtractionSource | null; run?: ExtractionRun | null; trail?:RewardTrail|null;resource?:ResourceRun|null;school?:SchoolCall|null;visited?:number[];lift?:{floor:number};veinSite?:VeinSite;branch?:BranchSource|null }
export type RewardInput = RewardInputBody & {campMiss?:import('./reward-camp').CampMiss};
type RewardInputBody =
  | import('./reward-root-extraction').RootInput
  | import('./reward-row-continuation').RowContinueInput
  | import('./reward-garden-retry').GardenRetryInput
  | import('./reward-rain').RainCareInput
  | import('./reward-rescue').RescueInput
  | {action:'campFlag';site:number;line:import('./reward-camp').CampLine;at:[number,number]}
  | import('./reward-help').HelpInput
  | import("./reward-bean").BeanInput
  | import("./reward-garden").GardenInput
  | import("./reward-kitchen").KitchenInput
  | {action:"picnicPlace";slot:number;at:[number,number]}
  | {action:"picnicEat";pot:string;seated:boolean;at:[number,number]}
  | {action:"crownLook"|"crownBegin"|"crownCall"|"crownCancel";theme?:import("./reward-crown").CrownTheme;bug?:import("./insects").BugId;at:[number,number]}
  | {action:"lanternLook"|"lanternLight";bug?:import("./insects").BugId;at:[number,number]}
  | {action:"arenaLook"|"arenaBegin"|"arenaEnd"|"arenaCancel";bug?:import("./reward-arena").RingBeetle;run?:string;answers?:Array<{stance:number;mark:number}>;at:[number,number]}
  | {action:"dragonBegin";fish:FishId;bait:BaitId;current:import("./river-items").Current;at:[number,number]}
  | {action:'boat';boat:Omit<import('./reward-boat').BoatInput,'at'>;at:[number,number]}
  | {action:"bridgeBuild";site:number;at:[number,number]}
  | {action:"pactBegin";tree:number;part:PactRun["part"];at:[number,number]}
  | {action:"pactEnd";run:string;answers:number[];at:[number,number]}
  | {action:"pactCancel";at:[number,number]}
  | {action:"nurseryLook";at:[number,number]}
  | {action:"nurseryBegin";kinds:string[];at:[number,number]}
  | {action:"nurseryStage";nursery:string;part:WoodPart;at:[number,number]}
  | {action:"nurseryEnd";nursery:string;challenge:string;answers:number[];at:[number,number]}
  | {action:"nurseryCancel";nursery:string;at:[number,number]}
  | {action:"cloudConsent";giver:string|null;at:[number,number]}
  | {action:"cloudBegin";beds:number[];at:[number,number]}
  | {action:"cloudEnd";run:string;marks:number[];at:[number,number]}
  | {action:"cloudCancel";at:[number,number]}
  | {action:"springPlace"|"springDraw";site:number;at:[number,number]}
  | {action:"conduitBegin"|"conduitCancel";at:[number,number]}
  | {action:"conduitEnd";run:string;answers:number[];at:[number,number]}
  | {action:"relayPlace";slot:number;at:[number,number]}
  | {action:"relaySend"|"relayTake";at:[number,number]}
  | {action:"dominoPreview";tree:number;direction:[number,number];at:[number,number]}
  | {action:"coreBegin";floor:number;at:[number,number]}
  | {action:"coreRoom";core:string;route:CoreRoute;at:[number,number]}
  | {action:"coreEnd";core:string;challenge:string;answers:number[];at:[number,number]}
  | {action:"coreCancel";core:string;at:[number,number]}
  | {action:"liftAnchor";floor:number;at:[number,number]}
  | {action:"liftRide";floor:number;to:number;at:[number,number]}
  | {action:"schoolStart";fish:FishId;bait:BaitId;current?:import("./river-items").Current;at:[number,number]}
  | {action:"resourceBegin";kind:ResourceKind;recipe:string;at:[number,number]}
  | {action:"resourceEnd";run:string;answers:number[];at:[number,number]}
  | {action:"resourceCancel";run:string;at:[number,number]}
  | {action:"trailBegin";kind:TrailKind;at:[number,number]}
  | {action:"trailStage";trail:string;at:[number,number]}
  | {action:"trailEnd";trail:string;challenge:string;answers:number[];at:[number,number]}
  | {action:"trailCancel";trail:string;at:[number,number]}
  | { action:"process"; kind:"wood"|"mineral"; recipe:string; at:[number,number]; floor?:number }
  | { action: "scan"; floor: number; mineral: ItemId; at: [number, number] }
  | { action: "extractBegin"; part: "bark" | "sap" | "seed"; at: [number, number] }
  | { action: "extractEnd"; run: string; marks: number[]; at: [number, number] };
export interface RewardReply {bridge?:import("./temporary-crossings").TemporaryCrossing;pact?:PactRun|null;nursery?:NurseryRun|null;cloud?:CloudRun|null;consented?:boolean;spring?:import("./reward-springs").RewardSpring;conduit?:ConduitRun|null;watered?:string[];used?:number;relay?:WaterRelay|null;moved?:number;core?:CoreRun|null; direction?: ScanDirection; distance?: "near" | "mid" | "far"; left?: number; run?: ExtractionRun; got?: Array<[ItemId, number]>; passed?: number;trail?:RewardTrail|null;completed?:boolean;resource?:ResourceRun|null;correction?:boolean;combo?:import("./combo-types").ComboEffect;school?:SchoolCall;ride?:LiftJourney }

export interface RewardReply {knownBugs?:import("./insects").BugId[];lured?:NonNullable<import("./trade").Purse["lured"]>}

export interface ProfessionRewards {crown?:import("./reward-crown").CrownQuest|null}
export interface RewardReply {crown?:import("./reward-crown").CrownQuest|null}

export interface RewardReply {picnic?:import("./cooking").Pot|null}

export interface ProfessionRewards {kitchen?:import("./reward-kitchen").KitchenRun|null;fire?:{recipe:import("./items").DishId;until:number}|null;flavor?:{recipe:import("./items").DishId;secondary:import("./items").MealBuffId;until:number}|null}
export interface RewardReply {kitchen?:import("./reward-kitchen").KitchenRun|null;banquet?:import("./cooking").Pot[];kitchenPassed?:boolean}

export interface ProfessionRewards {giant?:import("./reward-garden").GiantRun|null;pollen?:import("./reward-garden").PollenSample[]}
export interface RewardReply {giant?:import("./reward-garden").GiantRun|null;plots?:Record<string,import("./farm").Plot>;gardenPassed?:boolean}

export interface ProfessionRewards {bean?:import("./reward-bean").BeanRun|null}
export interface RewardReply {bean?:import("./reward-bean").BeanRun|null;beanPassed?:boolean}
