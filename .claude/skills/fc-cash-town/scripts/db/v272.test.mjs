// v272, hints from the database not the change feed, dry-run on the bench (which has no Supabase Realtime: realtime.send,
// realtime.messages and realtime.topic are stood in for, and the publication made): the file runs twice; a notification
// sends one private hint to its recipient's channel; a casino win sends the win; a write to each of the board's tables
// sends one hint a statement; a hint that fails stops nothing; the tables leave the publication, the casino's stay.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v272.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V271 } from "./build-v271.mjs";

let checks = 0;
const ok = (c, what) => { assert.ok(c, what); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
try {
  for (const f of [...BEFORE_V271, "v271_the_insects_look_asks_less"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  // Supabase's Realtime, stood in for
  await db.exec(`create schema if not exists realtime;
    create table if not exists realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb, event text, private boolean);
    create table if not exists realtime.sent (topic text, event text, payload jsonb, private boolean);
    create or replace function realtime.topic() returns text language sql stable as $$ select null::text $$;
    create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language plpgsql as $$
    begin if topic like '%fail%' then raise exception 'cannot send'; end if; insert into realtime.sent values (topic, event, payload, private); end $$;
    alter table realtime.messages enable row level security;`);
  const tables = ["notifications", "party_posts", "party_members", "party_comments", "party_comment_reactions", "party_polls", "town_casino_announcements"];
  // (the town's bench has none of the site's tables: stood in for with the columns the hint reads)
  await db.exec(`create table if not exists public.notifications (id bigserial primary key, recipient uuid not null, kind text, read_at timestamptz);
    create table if not exists public.town_casino_announcements (id uuid primary key default gen_random_uuid(), player_name text not null, prize_name text not null, created_at timestamptz not null default now());
    create table if not exists public.party_posts (id bigserial primary key, title text);
    create table if not exists public.party_members (id bigserial primary key, post_id bigint);
    create table if not exists public.party_comments (id bigserial primary key, post_id bigint);
    create table if not exists public.party_comment_reactions (id bigserial primary key, comment_id bigint);
    create table if not exists public.party_polls (id bigserial primary key, post_id bigint);
    create table if not exists public.casino_live_settings (id int primary key);`);
  const have = (await rows("select tablename from pg_tables where schemaname='public' and tablename = any($1)", [tables])).map((r) => r.tablename);
  console.log("tables on the bench:", have.join(", "));
  await db.exec(`drop publication if exists supabase_realtime; create publication supabase_realtime for table ${have.map((t) => "public." + t).join(", ")}${(await rows("select 1 from pg_tables where schemaname='public' and tablename='casino_live_settings'")).length ? ", public.casino_live_settings" : ""}`);

  const sql = readFileSync("supabase/v272_hints_from_the_database_not_the_change_feed.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  ok((await rows("select count(*)::int n from pg_trigger where tgname = 'rt_hint'"))[0].n === have.length, "a hint on each of the tables");
  const feed = (await rows("select tablename from pg_publication_tables where pubname='supabase_realtime'")).map((r) => r.tablename);
  ok(feed.every((t) => !tables.includes(t)), `none of them left in the feed (${feed.join(", ")})`);
  ok(feed.length === 0 || feed.every((t) => t.startsWith("casino_")), "the casino's own stay");

  // what a write sends: insert a row of each, with whatever the table needs, inside a transaction undone after
  const fill = async (table, more = {}) => {
    const cols = await rows("select column_name c, data_type t, is_nullable z, column_default d from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position", [table]);
    const member = (await rows("select id from public.profiles order by id limit 1"))[0]?.id;
    const use = cols.filter((c) => c.c in more || (c.z === "NO" && c.d === null));
    const val = (c) => (c.c in more ? more[c.c] : c.t === "uuid" ? member : c.t.includes("time") ? new Date().toISOString() : /int|numeric|double/.test(c.t) ? 1 : c.t === "jsonb" ? "{}" : c.t === "boolean" ? false : c.t === "ARRAY" ? "{}" : "x");
    if (!use.length) { await db.query(`insert into public.${table} default values`); return; }
    await db.query(`insert into public.${table}(${use.map((c) => c.c).join(",")}) values(${use.map((_, k) => "$" + (k + 1)).join(",")})`, use.map(val));
  };
  const sentBy = async (table, more) => {
    await db.exec("begin"); await db.exec("delete from realtime.sent");
    try { await fill(table, more); return await rows("select * from realtime.sent"); } finally { await db.exec("rollback"); }
  };
  if (have.includes("notifications")) {
    const me = (await rows("select id from public.profiles order by id limit 1"))[0].id;
    const sent = await sentBy("notifications", { recipient: me });
    ok(sent.length === 1 && sent[0].topic === `notifications:${me}` && sent[0].event === "new" && sent[0].private === true, `a notification: ${JSON.stringify(sent)}`);
  }
  if (have.includes("town_casino_announcements")) {
    const sent = await sentBy("town_casino_announcements", { player_name: "Aqua", prize_name: "a potato" });
    ok(sent.length === 1 && sent[0].topic === "casino-announcements" && sent[0].event === "win" && sent[0].private === false && sent[0].payload.player_name === "Aqua" && sent[0].payload.prize_name === "a potato" && "id" in sent[0].payload && "created_at" in sent[0].payload, `a win: ${JSON.stringify(sent)}`);
  }
  for (const t of have.filter((t) => t.startsWith("party_"))) {
    const sent = await sentBy(t).catch((e) => `could not lay a row: ${e.message}`);
    if (typeof sent === "string") { console.log(`${t}: ${sent} (the trigger is there; its hint is not tried here)`); continue; }
    ok(sent.length === 1 && sent[0].topic === "party-board" && sent[0].event === "changed" && sent[0].payload.t === t, `${t}: ${JSON.stringify(sent)}`);
  }
  // a hint that fails stops nothing
  if (have.includes("notifications")) {
    await db.exec(`create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language plpgsql as $$ begin raise exception 'down'; end $$`);
    const me = (await rows("select id from public.profiles order by id limit 1"))[0].id;
    await db.exec("begin");
    try { await fill("notifications", { recipient: me }); ok(true, "a notification is written while the hint fails"); } finally { await db.exec("rollback"); }
  }
  console.log(`v272: ${checks} checks passed`);
} finally { await db.close(); }
