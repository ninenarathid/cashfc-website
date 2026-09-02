"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DiscordCard() {
  const [serverId, setServerId] = useState(
    process.env.NEXT_PUBLIC_DISCORD_SERVER_ID ?? "");
  const [invite, setInvite] = useState(
    process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoaded(true); return; }
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["discord_server_id", "discord_invite_url"])
      .then(({ data }) => {
        for (const r of data ?? []) {
          if (r.key === "discord_server_id" && r.value) setServerId(r.value);
          if (r.key === "discord_invite_url" && r.value) setInvite(r.value);
        }
        setLoaded(true);
      });
  }, []);

  if (!loaded || (!serverId && !invite)) return null;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/8">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="font-display font-semibold text-[#a5b2ff]">
            FFXIV : Cafe&rsquo; &amp; Shabu Discord
          </div>
        </div>
        {invite && (
          <a
            href={invite}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#5865F2] px-5 py-2 text-[14px] font-medium text-white no-underline transition-opacity hover:opacity-90"
          >
            Join the Discord
          </a>
        )}
      </div>
      {serverId && (
        <iframe
          src={`https://discord.com/widget?id=${serverId}&theme=dark`}
          className="h-72 w-full border-0"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          title="Discord widget"
        />
      )}
    </section>
  );
}
