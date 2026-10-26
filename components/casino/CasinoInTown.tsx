"use client";
import { CasinoLive, type CasinoBench } from './CasinoSandbox';
import CasinoRoom, { type CasinoInTown as Room } from './CasinoRoom';

/**
 * The Popoto Casino's sheet in the town (the owner, 2026-10-27: walked into from the town, no other page): mounted by
 * Town.tsx while I am in the casino's room (lib/town/casino-room), LIVE only: the slot sheet, the room's results, the
 * desk at the counter. The room itself is drawn by the town's frame (lib/town/casino-room-art).
 */
export default function CasinoInTown({ bench, ...room }: Room & { bench?: CasinoBench | null }) {
  return <CasinoLive bench={bench}><CasinoRoom town={room} /></CasinoLive>;
}
