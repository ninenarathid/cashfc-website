"use client";

import { useEffect, useMemo, useState } from "react";
import PopotoRare from "@/components/PopotoRare";
import { toast } from "@/components/ui/Toast";
import { useRareDemo } from "@/lib/popoto-rare-demo";
import { RARE_INVENTORY, type RareTier } from "@/lib/popoto-rare";
import { useLang } from "@/lib/i18n";

/**
 * `testRarePotato("ultra")` in the console, on any page, locally: a parcel of
 * a real flavour of that tier (see useRareDemo), to try the unwrapping. Nothing
 * is written — no gift, no opening stamped — and on the deployed site the
 * command does not exist.
 *
 * `testRareToast()` is the other half: the gold card in the corner that says
 * one has arrived. It is the hardest thing on the site to see on purpose —
 * somebody else has to send you a popoto, and it has to come up wrapped, while
 * you happen to be looking at the page — so without this it was tuned blind.
 *
 * On every page rather than on a member's, so both are there wherever somebody
 * happens to be when they want to see them.
 */
export default function RareDevTools() {
  const { t: say } = useLang();
  const [tier, setTier] = useState<RareTier | null>(null);
  // A new roll each time the command is typed, even for the same tier.
  const [roll, setRoll] = useState(0);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as {
      testRarePotato?: (t?: RareTier) => void;
      testRareToast?: (who?: string) => void;
    };
    w.testRarePotato = (t = "rare") => {
      setTier(t === "super" || t === "ultra" ? t : "rare");
      setRoll((n) => n + 1);
    };
    // No picture: a face here would be whichever member happened to be handy,
    // and the card has to hold up without one anyway — the sender may not have
    // uploaded anything.
    w.testRareToast = (who = "Areeya Lovekin") => toast({
      text: say("notif.popotoRare", { who }),
      href: RARE_INVENTORY,
      tone: "rare",
    });
    return () => { delete w.testRarePotato; delete w.testRareToast; };
  }, [say]);

  const gifts = useRareDemo(tier != null);
  const gift = useMemo(() => {
    if (!tier || !gifts) return null;
    // One of the tier asked for, at random; the nearest tier that has one if
    // that tier has nothing in it yet.
    const of = (x: RareTier) => gifts.filter((g) => g.tier === x);
    const order: RareTier[] = tier === "ultra" ? ["ultra", "super", "rare"]
      : tier === "super" ? ["super", "rare", "ultra"] : ["rare", "super", "ultra"];
    const pool = order.map(of).find((p) => p.length) ?? [];
    const g = pool[Math.floor(Math.random() * pool.length)];
    return g ? { ...g, openedAt: null, at: new Date().toISOString() } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, gifts, roll]);

  if (process.env.NODE_ENV === "production" || !tier || !gift) return null;
  return (
    <PopotoRare key={roll} preview={gift} from="ทดสอบ" onClose={() => setTier(null)} />
  );
}
