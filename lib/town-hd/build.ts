/**
 * The HD-2D trial's buildings (the owner, 2026-11-17: "ลองทำขึ้นมาก่อนโดยไม่มี model 3d ... ให้ claude mock ขึ้นมาคร่าวๆ"):
 * each of the editor's town's wide things (lib/town/town2-map.json: a house, a gate, a stall) stood up as blocks on its
 * own footprint, to its own picture's height, in the colours of its picture. Rough stand-ins for models to come: what
 * is being tried is the world in depth, with light and shadow, not these shapes.
 *
 * A tile is one unit; x runs east, z south (the town's y), y up.
 */
import * as THREE from "three";
import { T2_HALL, T2_STAGE, T2_STAGE_BASE, T2_STAGE_UP, t2Lift, t2OnStage, t2Tile } from "@/lib/town/town2";
import * as skin from "./textures";

/** Isometric pixels up to a tile of height (a 2:1 picture looks down at 30°: a tile's side is 45.25 px, cos 30° of it up). */
export const PX_UP = 39.2;

export type Box4 = readonly [number, number, number, number];

export interface Kit {
  roofDark: THREE.Material; roofBlue: THREE.Material; roofGreen: THREE.Material; roofThatch: THREE.Material; roofWood: THREE.Material;
  walls: Record<"plaster" | "wood" | "white" | "red", THREE.MeshLambertMaterial>;
  planks: THREE.Material; darkWood: THREE.Material; post: THREE.Material; stone: THREE.Material; brick: THREE.Material;
  red: THREE.Material; black: THREE.Material; navy: THREE.Material; gable: THREE.Material; bronze: THREE.Material; clay: THREE.Material;
  door: THREE.Material; doorBlue: THREE.Material; wheel: THREE.Material; notices: THREE.Material;
  /** Lit from inside at night: lanterns, a kiln's mouth. */
  ember: THREE.MeshLambertMaterial; lantern: THREE.MeshLambertMaterial;
  water: THREE.MeshLambertMaterial;
  /** Whether something stands on a tile of the map being built. */
  shut: (x: number, y: number) => boolean;
}

export function makeKit(water: THREE.Texture, shut: (x: number, y: number) => boolean): Kit {
  const lam = (map: THREE.Texture, more: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ map, ...more });
  const wallOf = (k: "plaster" | "wood" | "white" | "red") => {
    const s = skin.wall(k);
    return lam(s.map, { emissiveMap: s.glow, emissive: 0xffbf70, emissiveIntensity: 0 });
  };
  return {
    roofDark: lam(skin.roofTiles(0x3b3d4a), { side: THREE.DoubleSide }), roofBlue: lam(skin.roofTiles(0x41506a), { side: THREE.DoubleSide }),
    roofGreen: lam(skin.roofTiles(0x3f8275), { side: THREE.DoubleSide }), roofThatch: lam(skin.thatch(0xc9a25a), { side: THREE.DoubleSide }),
    roofWood: lam(skin.planks(0x7a4a30, 9), { side: THREE.DoubleSide }),
    walls: { plaster: wallOf("plaster"), wood: wallOf("wood"), white: wallOf("white"), red: wallOf("red") },
    planks: lam(skin.planks(0x9a6040)), darkWood: lam(skin.planks(0x5a3a28, 7)), post: lam(skin.plain(0x4a3020)),
    stone: lam(skin.stone(0x8d8f96)), brick: lam(skin.stone(0x8a4a3a)),
    red: lam(skin.plain(0xc23a2c)), black: lam(skin.plain(0x2a2a30)), navy: lam(skin.plain(0x26365a)), gable: lam(skin.plain(0xddd0b4, 0.06)),
    bronze: lam(skin.plain(0x5a4a34)), clay: lam(skin.plain(0xb0623c)),
    door: lam(skin.door(0x26365a)), doorBlue: lam(skin.door(0x8a2a2a)),
    wheel: lam(skin.wheel(), { alphaTest: 0.5, side: THREE.DoubleSide }), notices: lam(skin.notices()),
    ember: lam(skin.plain(0xff8a3a), { emissive: 0xff7a2a, emissiveIntensity: 0.6 }),
    lantern: lam(skin.plain(0xd8402c), { emissive: 0xff5a30, emissiveIntensity: 0.15 }),
    water: new THREE.MeshLambertMaterial({ map: water, color: 0xbfe6ff, transparent: true, opacity: 0.84 }),
    shut,
  };
}

/* ── shapes ─────────────────────────────────────────────────────────────── */

/** A block whose pictures run at the town's measure: `su` and `sv` repeats a tile, along and up its sides. */
function block(w: number, h: number, d: number, su = 1, sv = 1): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let i = 0; i < 24; i++) {
    const f = i >> 2, side = f !== 2 && f !== 3;
    const U = f < 2 ? d : w, V = side ? h : d;
    uv.setXY(i, uv.getX(i) * U * su, uv.getY(i) * V * (side ? sv : su));
  }
  return g;
}

/** A gable roof, its ridge along x: two slopes over w × d, `rise` up. */
function gable(w: number, d: number, rise: number): THREE.BufferGeometry {
  const s = Math.hypot(d / 2, rise), hw = w / 2, hd = d / 2;
  const P = [
    -hw, 0, hd, hw, 0, hd, hw, rise, 0, -hw, 0, hd, hw, rise, 0, -hw, rise, 0,
    hw, 0, -hd, -hw, 0, -hd, -hw, rise, 0, hw, 0, -hd, -hw, rise, 0, hw, rise, 0,
  ];
  const U = [0, 0, w, 0, w, s, 0, 0, w, s, 0, s, 0, 0, w, 0, w, s, 0, 0, w, s, 0, s];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.computeVertexNormals();
  return g;
}
/** The two walls under a gable's ends (ridge along x). */
function gableEnds(w: number, d: number, rise: number): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2;
  const P = [hw, 0, hd, hw, 0, -hd, hw, rise, 0, -hw, 0, -hd, -hw, 0, hd, -hw, rise, 0];
  const U = [0, 0, d / 2, 0, d / 4, rise / 2, 0, 0, d / 2, 0, d / 4, rise / 2];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.computeVertexNormals();
  return g;
}
/** A four-sided roof coming to a point. */
function pyramid(w: number, d: number, rise: number): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2, sz = Math.hypot(hd, rise), sx = Math.hypot(hw, rise);
  const P = [
    -hw, 0, hd, hw, 0, hd, 0, rise, 0, hw, 0, hd, hw, 0, -hd, 0, rise, 0,
    hw, 0, -hd, -hw, 0, -hd, 0, rise, 0, -hw, 0, -hd, -hw, 0, hd, 0, rise, 0,
  ];
  const U = [0, 0, w, 0, w / 2, sz, 0, 0, d, 0, d / 2, sx, 0, 0, w, 0, w / 2, sz, 0, 0, d, 0, d / 2, sx];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.computeVertexNormals();
  return g;
}

function put(to: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  to.add(m);
  return m;
}
const span = (b: Box4) => ({ x0: b[0], z0: b[1], x1: b[2], z1: b[3], w: b[2] - b[0], d: b[3] - b[1], cx: (b[0] + b[2]) / 2, cz: (b[1] + b[3]) / 2 });

/** A roof over w × d at `y`, its ridge along the longer way. */
function roof(to: THREE.Object3D, K: Kit, mat: THREE.Material, cx: number, y: number, cz: number, w: number, d: number, rise: number, over = 0.45, ends: THREE.Material | null = K.gable) {
  const alongX = w >= d, L = (alongX ? w : d) + over * 2, S = (alongX ? d : w) + over * 2, ry = alongX ? 0 : Math.PI / 2;
  put(to, gable(L, S, rise), mat, cx, y, cz, ry);
  put(to, block(L, 0.16, 0.26), K.black, cx, y + rise + 0.04, cz, ry);
  if (ends) put(to, gableEnds(L - over * 2, S, rise), ends, cx, y, cz, ry);
}
/**
 * What stands on posts (a shed, a stall, a tower's legs), as one whole block between them. A thing wears its own picture
 * (the engine's `dress`), and a picture's post never falls quite on a thin post made here: part of it would land on the
 * post and part far behind, and be seen torn. On one whole face it lies unbroken.
 */
function posts(to: THREE.Object3D, mat: THREE.Material, x0: number, z0: number, x1: number, z1: number, y0: number, h: number, thick = 0.2) {
  put(to, block(Math.abs(x1 - x0) + thick, h, Math.abs(z1 - z0) + thick), mat, (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
}

interface HouseOpts { wall: "plaster" | "wood" | "white" | "red"; roof: THREE.Material; storeys?: number; inset?: number; door?: THREE.Material; rise?: number }
function house(to: THREE.Object3D, K: Kit, b: Box4, h: number, o: HouseOpts) {
  const s = span(b), inset = o.inset ?? 0.3, W = Math.max(1.2, s.w - inset * 2), D = Math.max(1.2, s.d - inset * 2);
  const storeys = o.storeys ?? 1, low = Math.min(W, D);
  const rise = Math.min(h * (o.rise ?? 0.4), (low / 2 + 0.45) * 0.9), wallH = Math.max(1.5, h - rise - 0.25);
  put(to, block(W + 0.24, 0.25, D + 0.24), K.stone, s.cx, 0.125, s.cz);
  put(to, block(W, wallH, D, 0.5, storeys / wallH), K.walls[o.wall], s.cx, 0.25 + wallH / 2, s.cz);
  roof(to, K, o.roof, s.cx, 0.25 + wallH, s.cz, W, D, rise);
  if (o.door) {
    const m = put(to, new THREE.PlaneGeometry(1.0, 1.5), o.door, s.cx, 0.25 + 0.75, s.cz + D / 2 + 0.02);
    m.castShadow = false;
  }
}

/** The two ends of a gateway: the closed tiles of its footprint furthest apart, or its longer way's ends. */
function gateEnds(K: Kit, b: Box4): [THREE.Vector2, THREE.Vector2] {
  const s = span(b), shut: THREE.Vector2[] = [];
  for (let z = Math.floor(s.z0); z <= Math.floor(s.z1); z++) for (let x = Math.floor(s.x0); x <= Math.floor(s.x1); x++) {
    if (K.shut(x, z)) shut.push(new THREE.Vector2(x + 0.5, z + 0.5));
  }
  let best: [THREE.Vector2, THREE.Vector2] | null = null, bd = 1.5;
  for (const a of shut) for (const c of shut) { const d = a.distanceTo(c); if (d > bd) { bd = d; best = [a, c]; } }
  if (best) return best;
  return s.w >= s.d ? [new THREE.Vector2(s.x0 + 0.3, s.cz), new THREE.Vector2(s.x1 - 0.3, s.cz)] : [new THREE.Vector2(s.cx, s.z0 + 0.3), new THREE.Vector2(s.cx, s.z1 - 0.3)];
}
/** A group laid from one point to another: its own x runs between them. */
function between(to: THREE.Object3D, a: THREE.Vector2, c: THREE.Vector2): { g: THREE.Group; len: number } {
  const g = new THREE.Group();
  g.position.set((a.x + c.x) / 2, 0, (a.y + c.y) / 2);
  g.rotation.y = Math.atan2(-(c.y - a.y), c.x - a.x);
  to.add(g);
  return { g, len: a.distanceTo(c) };
}

/* ── the town's wide things ─────────────────────────────────────────────── */

export interface Built { spin?: THREE.Object3D }

/** Stand a wide thing up; false where it has no blocks of its own (it is then drawn from its picture). */
export function buildThing(to: THREE.Object3D, K: Kit, name: string, b: Box4, h: number, plain = false): Built | false {
  const s = span(b);
  h = Math.min(8, Math.max(0.3, h));
  const is = (re: RegExp) => re.test(name);

  if (is(/^(house)$/)) { house(to, K, b, h, { wall: "plaster", roof: K.roofDark, door: K.door }); return {}; }
  if (is(/^townhouse$/)) { house(to, K, b, h, { wall: "plaster", roof: K.roofBlue, storeys: 2, door: K.door }); return {}; }
  if (is(/^machiya_shop$/)) { house(to, K, b, h, { wall: "wood", roof: K.roofBlue, storeys: 2, door: K.door, inset: 0.5 }); return {}; }
  if (is(/^kura$/)) { house(to, K, b, h, { wall: "white", roof: K.roofDark, door: K.door, inset: 0.2 }); return {}; }
  if (is(/^bathhouse$/)) {
    house(to, K, b, h, { wall: "red", roof: K.roofDark, door: K.doorBlue, inset: 0.7, rise: 0.36 });
    put(to, block(0.8, h + 1.6, 0.8), K.brick, s.x0 + 1.5, (h + 1.6) / 2, s.z0 + 1.5);
    return {};
  }

  if (is(/^shrine_hall$/)) {
    const W = s.w - 0.6, D = s.d - 0.6, floor = 0.7, wallH = h * 0.36, rise = h * 0.4;
    put(to, block(W, floor, D), K.darkWood, s.cx, floor / 2, s.cz);
    for (let i = 0; i < 3; i++) put(to, block(2.2, floor * (3 - i) / 4, 0.4), K.planks, s.cx, floor * (3 - i) / 8, s.cz + D / 2 + 0.2 + i * 0.4);
    put(to, block(W - 2.4, wallH, D - 2.4, 0.5, 1 / wallH), K.walls.wood, s.cx, floor + wallH / 2, s.cz - 0.2);
    posts(to, K.red, s.cx - W / 2 + 0.3, s.cz - D / 2 + 0.3, s.cx + W / 2 - 0.3, s.cz + D / 2 - 0.3, floor, wallH, 0.24);
    roof(to, K, K.roofGreen, s.cx, floor + wallH, s.cz, W - 1.2, D - 1.2, rise, 0.9);
    return {};
  }

  if (is(/^tea_house$/)) {
    const W = s.w - 0.5, D = s.d - 0.5, top = h * 0.55;
    put(to, block(W, 0.4, D), K.planks, s.cx, 0.2, s.cz);
    posts(to, K.post, s.cx - W / 2 + 0.2, s.cz - D / 2 + 0.2, s.cx + W / 2 - 0.2, s.cz + D / 2 - 0.2, 0.4, top - 0.4);
    roof(to, K, K.roofThatch, s.cx, top, s.cz, W - 0.4, D - 0.4, h - top, 0.55, null);
    put(to, block(1.2, 0.25, 0.5), K.red, s.cx, 0.55, s.cz + D / 2 - 0.5);
    put(to, block(0.06, 1.7, 0.06), K.post, s.x0 + 0.2, 0.85, s.z1 - 0.1);
    put(to, new THREE.ConeGeometry(0.95, 0.3, 12), K.red, s.x0 + 0.2, 1.75, s.z1 - 0.1);
    return {};
  }

  if (is(/^forge$/)) {
    const W = s.w - 0.6, D = s.d - 0.6, top = h * 0.62;
    posts(to, K.post, s.cx - W / 2, s.cz - D / 2, s.cx + W / 2, s.cz + D / 2, 0, top, 0.24);
    roof(to, K, K.roofDark, s.cx, top, s.cz, W, D, h - top, 0.4, null);
    put(to, new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), K.clay, s.cx - W / 4, 0, s.cz - D / 5);
    put(to, block(0.4, 0.4, 0.1), K.ember, s.cx - W / 4, 0.3, s.cz - D / 5 + 0.84);
    put(to, block(1.6, 0.55, 0.7), K.darkWood, s.cx + W / 5, 0.275, s.cz + D / 5);
    return {};
  }

  if (is(/^water_wheel$/)) {
    const along = s.w >= s.d, hutLen = Math.min(3.6, (along ? s.w : s.d) * 0.5), r = Math.min(1.7, (along ? s.d : s.w) * 0.42);
    const hut: Box4 = along ? [s.x1 - hutLen, s.z0, s.x1, s.z1] : [s.x0, s.z0, s.x1, s.z0 + hutLen];
    house(to, K, hut, 3.2, { wall: "wood", roof: K.roofThatch, door: K.door, inset: 0.35 });
    const g = new THREE.Group();
    g.position.set(along ? s.x1 - hutLen - r * 0.75 : s.cx, r * 0.72, along ? s.cz : s.z0 + hutLen + r * 0.75);
    if (!along) g.rotation.y = Math.PI / 2;
    const turn = new THREE.Group();
    g.add(turn);
    for (const z of [-0.3, 0.3]) put(turn, new THREE.CircleGeometry(r, 24), K.wheel, 0, 0, z);
    const rim = put(turn, new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.6, 24, 1, true), K.roofWood, 0, 0, 0);
    rim.rotation.x = Math.PI / 2;
    put(g, block(0.2, 0.2, 1.4), K.post, 0, 0, 0);
    to.add(g);
    return { spin: turn };
  }

  if (is(/^torii$/)) {
    const [a, c] = gateEnds(K, b), { g, len } = between(to, a, c), up = Math.max(3.4, h * 0.82);
    for (const x of [-len / 2, len / 2]) {
      put(g, block(0.46, up, 0.46), K.red, x, up / 2, 0);
      put(g, block(0.6, 0.3, 0.6), K.stone, x, 0.15, 0);
    }
    put(g, block(len + 1.5, 0.3, 0.42), K.black, 0, up + 0.05, 0);
    put(g, block(len + 1.1, 0.2, 0.3), K.red, 0, up - 0.2, 0);
    put(g, block(len + 0.6, 0.2, 0.24), K.red, 0, up - 0.95, 0);
    return {};
  }
  if (is(/^(village_gate|tall_wooden_village_gateway)/)) {
    const [a, c] = gateEnds(K, b), { g, len } = between(to, a, c), up = Math.max(2.6, h * 0.85), thatched = is(/^village_gate/);
    for (const x of [-len / 2, len / 2]) put(g, block(0.55, up, 0.55), K.post, x, up / 2, 0);
    put(g, block(len + 0.5, 0.3, 0.3), K.post, 0, up - 0.4, 0);
    if (thatched) { put(g, gable(len + 1.2, 1.3, 0.55), K.roofThatch, 0, up, 0); put(g, block(1.1, 0.6, 0.08), K.planks, 0, up - 1.0, 0); }
    return {};
  }

  if (is(/^(money_changer|yatai)$/)) {
    const W = s.w - 0.3, D = s.d - 0.2, top = Math.max(1.8, h * 0.78), wood = is(/^yatai/);
    put(to, block(W * 0.92, 0.9, D * 0.5), K.planks, s.cx, 0.45, s.cz + D * 0.12);
    posts(to, K.post, s.cx - W / 2, s.cz - D / 2, s.cx + W / 2, s.cz + D / 2, 0, top, 0.14);
    roof(to, K, wood ? K.roofWood : K.roofDark, s.cx, top, s.cz, W, D, 0.5, 0.3, null);
    put(to, block(W * 0.9, 0.38, 0.05), K.navy, s.cx, top - 0.2, s.cz + D / 2);
    if (wood) for (const x of [-W / 2 - 0.1, W / 2 + 0.1]) put(to, block(0.26, 0.36, 0.26), K.lantern, s.cx + x, top - 0.35, s.cz + D / 2 + 0.1);
    return {};
  }
  if (is(/^(trade_board_cloud|kosatsu_board_cloud)$/)) {
    const along = s.w >= s.d, a = along ? new THREE.Vector2(s.x0 + 0.2, s.cz) : new THREE.Vector2(s.cx, s.z0 + 0.2);
    const c = along ? new THREE.Vector2(s.x1 - 0.2, s.cz) : new THREE.Vector2(s.cx, s.z1 - 0.2), { g, len } = between(to, a, c), up = Math.max(2, h * 0.8);
    put(g, block(len + 0.2, up, 0.3), K.notices, 0, up / 2, 0);
    put(g, gable(len + 0.6, 1.0, 0.32), K.roofDark, 0, up, 0);
    return {};
  }
  if (is(/dining_table/)) {
    const top = Math.max(0.42, h), W = s.w - 0.2, D = s.d - 0.2;
    put(to, block(W, top + 0.06, D), K.planks, s.cx, (top + 0.06) / 2, s.cz);
    if (0) posts(to, K.darkWood, s.cx - W / 2 + 0.15, s.cz - D / 2 + 0.15, s.cx + W / 2 - 0.15, s.cz + D / 2 - 0.15, 0, top, 0.14);
    return {};
  }

  if (is(/^wishing_basin$/)) {
    const r = Math.min(s.w, s.d) / 2 - 0.05;
    put(to, new THREE.CylinderGeometry(r, r + 0.08, 0.7, 24), K.stone, s.cx, 0.35, s.cz);
    const w = put(to, new THREE.CircleGeometry(r - 0.25, 24), K.water, s.cx, 0.71, s.cz);
    w.rotation.x = -Math.PI / 2; w.castShadow = false;
    put(to, new THREE.CylinderGeometry(0.3, 0.42, 1.5, 12), K.stone, s.cx, 0.75, s.cz);
    put(to, new THREE.CylinderGeometry(0.65, 0.3, 0.25, 12), K.stone, s.cx, 1.5, s.cz);
    put(to, new THREE.SphereGeometry(0.22, 8, 6), K.bronze, s.cx, 1.8, s.cz);
    return {};
  }
  if (is(/^temizuya$/)) {
    const W = s.w - 0.3, D = s.d - 0.3, top = h * 0.68;
    put(to, block(W, 0.8, D), K.stone, s.cx, 0.4, s.cz);
    const w = put(to, new THREE.PlaneGeometry(W - 0.4, D - 0.4), K.water, s.cx, 0.81, s.cz);
    w.rotation.x = -Math.PI / 2; w.castShadow = false;
    posts(to, K.post, s.cx - W / 2 + 0.12, s.cz - D / 2 + 0.12, s.cx + W / 2 - 0.12, s.cz + D / 2 - 0.12, 0.8, top - 0.8, 0.16);
    put(to, pyramid(W + 1.1, D + 1.1, h - top), K.roofBlue, s.cx, top, s.cz);
    return {};
  }
  if (is(/^bell_tower$/)) {
    const W = s.w - 0.5, D = s.d - 0.5, top = h * 0.6;
    put(to, block(W, 0.5, D), K.stone, s.cx, 0.25, s.cz);
    posts(to, K.darkWood, s.cx - W / 2 + 0.4, s.cz - D / 2 + 0.4, s.cx + W / 2 - 0.4, s.cz + D / 2 - 0.4, 0.5, top - 0.5, 0.34);
    put(to, pyramid(W + 1.0, D + 1.0, h - top), K.roofDark, s.cx, top, s.cz);
    put(to, new THREE.SphereGeometry(0.6, 10, 8), K.bronze, s.cx, top - 0.9, s.cz);
    return {};
  }
  if (is(/^watchtower$/)) {
    const W = s.w - 1.0, D = s.d - 1.0, deck = h * 0.6;
    posts(to, K.darkWood, s.cx - W / 2, s.cz - D / 2, s.cx + W / 2, s.cz + D / 2, 0, deck, 0.22);
    put(to, block(W + 0.5, 0.16, D + 0.5), K.planks, s.cx, deck, s.cz);
    put(to, block(W - 0.2, h * 0.26, D - 0.2, 1, 1), K.planks, s.cx, deck + h * 0.13, s.cz);
    put(to, block(W + 0.4, 0.14, D + 0.4), K.darkWood, s.cx, deck + h * 0.26 + 0.07, s.cz);
    const ladder = put(to, block(0.5, deck * 1.1, 0.08), K.post, s.cx, deck / 2, s.cz + D / 2 + 0.6);
    ladder.rotation.x = 0.42;
    return {};
  }
  // (a barn, a shed, a glasshouse, a cart: a plain house to its picture's height; its picture makes it what it is)
  if (plain) { house(to, K, b, h, { wall: "wood", roof: K.roofDark, inset: 0.15 }); return {}; }
  return false;
}

/** The festival stage: a round top people walk on, and its stairs. */
export function buildStage(to: THREE.Object3D, K: Kit) {
  const up = T2_STAGE_UP / PX_UP, r = 4.05, cx = T2_STAGE_BASE.x - 0.27, cz = T2_STAGE_BASE.y + 0.28;
  put(to, new THREE.CylinderGeometry(r, r, up, 36, 1, true), K.darkWood, cx, up / 2, cz);
  const top = new THREE.CircleGeometry(r, 36), uv = top.attributes.uv, pos = top.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
  const m = put(to, top, K.planks, cx, up, cz);
  m.rotation.x = -Math.PI / 2;
  const [x0, z0, x1, z1] = T2_STAGE.box;
  for (let z = Math.floor(z0) - 1; z <= Math.floor(z1) + 1; z++) for (let x = Math.floor(x0) - 1; x <= Math.floor(x1) + 2; x++) {
    if (!t2OnStage(x, z) || t2Lift(x + 0.5, z + 0.5) >= T2_STAGE_UP) continue;
    for (let i = 0; i < 4; i++) {
      const hh = t2Lift(x + 0.125 + i * 0.25, z + 0.5) / PX_UP;
      if (hh > 0.02) put(to, block(0.25, hh, 1), K.planks, x + 0.125 + i * 0.25, hh / 2, z + 0.5);
    }
  }
}

/** The kitchen hall from outside: one block over its floor and walls, and its roof (all of it lifted off while I am inside). */
export function buildHall(to: THREE.Object3D, K: Kit, h: number) {
  const s = span(T2_HALL.box as unknown as Box4), wallH = 2.3;
  put(to, block(s.w - 0.4, wallH, s.d - 0.4), K.walls.wood, s.cx, wallH / 2, s.cz);
  roof(to, K, K.roofDark, s.cx, wallH, s.cz, s.w - 0.6, s.d - 0.6, Math.max(1.4, h - wallH), 0.7);
}
