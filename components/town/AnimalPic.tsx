"use client";

import { useEffect, useRef } from "react";
import type { Sex, SpeciesId } from "@/lib/town/animals";
import type { SceneryKit } from "@/lib/town/scenery";
import { animalK, animalPicture, animalSize, drawAnimal } from "./pasture-draw";

/**
 * A little picture of an animal: its own (the pasture's sheet), or its stand-in drawn the same as on the map. Its own file
 * so that the bag's animal book (TownAnimalBook) draws it without the pasture's whole panel (TownAnimals).
 */
export function AnimalPic({ species, breed, stage, size = 48, kit, dark = false, pose = "idle", sex }: { species: SpeciesId; breed: string; stage: "baby" | "young" | "adult"; size?: number; kit: SceneryKit | null; dark?: boolean; pose?: "idle" | "sleep"; sex?: Sex }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    // (sized to the box by its longer side: a picture at a whole number of the screen's pixels to one of its own where it
    // fits, so its pixels stay square; a stand-in as before)
    const box = animalSize(kit, { species, breed, stage, sex });
    const art = animalPicture(kit, { species, breed, stage, right: true, sex }, pose), k = art ? animalK(species, art.name) : 0.6;
    let s = Math.min(2.6, (size * 0.8) / Math.max(18, box.w * 1.15));
    if (art && kit) { const [w, h] = kit.sizeOf(art.name), fit = (size * 0.88) / Math.max(w, h); s = (fit >= 1 ? Math.min(3, Math.floor(fit)) : fit) / k; }
    drawAnimal(ctx, kit, { species, breed, stage, pose, right: true, sex }, { x: size / 2, y: size * 0.93 }, s, dpr, 0, true);
    // (a breed not found yet: a solid silhouette, its outline alone and nothing of its look; the owner, 2026-10-20,
    // "ถ้ายังไม่ปลดล็อคช่วยทำเป็นเงาทึบไว้ก่อน ไม่บอกหน้าตา")
    if (dark) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "#3a4256"; ctx.fillRect(0, 0, size, size); ctx.globalCompositeOperation = "source-over"; }
  }, [species, breed, stage, size, kit, dark, pose, sex]);
  return <canvas ref={ref} aria-hidden className="shrink-0" style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}
