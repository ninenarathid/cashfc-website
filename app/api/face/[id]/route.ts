import { NextResponse } from "next/server";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";

/**
 * One character's name and Lodestone portrait.
 *
 * The roster lives in members.json, which is written nightly and is two thirds
 * of a megabyte. Pages that show many members already ship the slice they need;
 * the header shows exactly one — whoever is signed in — and sending five hundred
 * entries to every page on the site to find that one would be a poor trade.
 *
 * Nothing here is private: it is the same name and picture the board renders for
 * anybody. The cache headers are generous because the crawler moves it once a
 * night at most.
 */
const data = raw as unknown as BoardData;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = data.members.find((x) => String(x.id) === id);
  if (!m) return NextResponse.json({ name: null, avatar: null }, { status: 404 });
  return NextResponse.json(
    { name: m.name, avatar: m.avatar ?? null, portrait: m.portrait ?? null },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
