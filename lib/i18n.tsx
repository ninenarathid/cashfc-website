"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type Lang = "th" | "en";
export const LANGS: { key: Lang; label: string; short: string }[] = [
  { key: "th", label: "ภาษาไทย", short: "ไทย" },
  { key: "en", label: "English", short: "EN" },
];

const STORAGE_KEY = "fc_lang";

/**
 * What stays in English, always.
 *
 * Job names, tag labels, grades and the vocabulary of the game itself — parse,
 * log, savage, extreme, achievement, mount, Lodestone, FF Logs. These are what
 * the FC actually says out loud, and a Thai rendering of "Legendary Crafter" or
 * "parse" would be a translation nobody asked for and nobody uses. The dictionary
 * below therefore covers the site's own furniture: headings, buttons, empty
 * states, explanations.
 */
type Entry = { en: string; th: string };

const DICT = {
  // ── Navigation and account ──────────────────────────────────────────
  "nav.home": { en: "Home", th: "หน้าแรก" },
  "nav.members": { en: "Members", th: "สมาชิก" },
  "nav.leaderboards": { en: "Leaderboards", th: "อันดับ" },
  "nav.signIn": { en: "Sign in", th: "เข้าสู่ระบบ" },
  "nav.signOut": { en: "Sign out", th: "ออกจากระบบ" },
  "nav.profile": { en: "My profile", th: "โปรไฟล์ของคุณ" },
  "member.kindSavage": { en: "Savage", th: "Savage" },
  "member.kindUltimate": { en: "Ultimate", th: "Ultimate" },
  "board.progAny": { en: "Progressing: any", th: "กำลังเล่น: ทั้งหมด" },
  "board.progressingAny": {
    en: "Anyone progressing ({n})",
    th: "ใครก็ได้ที่กำลังเล่นอยู่ ({n})",
  },
  "nav.feedback": { en: "Feedback", th: "แจ้งเรื่อง" },
  "nav.guides": { en: "Guides", th: "ไกด์" },
  "log.title": { en: "Site updates", th: "อัพเดทเว็ป" },
  "log.intro": {
    en: "What has changed here, newest first.",
    th: "มีอะไรเปลี่ยนไปบ้างในเว็ปนี้ ใหม่สุดอยู่บน",
  },
  "log.latest": { en: "Latest update", th: "อัพเดทล่าสุด" },
  "log.more": { en: "Older updates", th: "อัพเดทก่อนหน้า" },
  "log.less": { en: "Show less", th: "ย่อ" },
  "log.today": { en: "today", th: "วันนี้" },
  "log.yesterday": { en: "yesterday", th: "เมื่อวาน" },
  "log.new": { en: "New", th: "ใหม่" },
  "log.better": { en: "Better", th: "ปรับปรุง" },
  "log.fix": { en: "Fixed", th: "แก้ไข" },
  "log.none": { en: "Nothing here yet.", th: "ยังไม่มีอะไร" },
  "guide.read": { en: "Read", th: "อ่าน" },
  "guide.quiz": { en: "Quiz", th: "ทดสอบ" },
  "guide.slot": { en: "Your spot", th: "ตำแหน่ง" },
  "guide.group": { en: "{g} group", th: "กลุ่ม {g}" },
  "guide.prev": { en: "← Back", th: "← ก่อนหน้า" },
  "guide.next": { en: "Next →", th: "ถัดไป →" },
  "guide.gate": {
    en: "Answer correctly to carry on",
    th: "ตอบให้ถูกก่อนถึงจะไปต่อได้",
  },
  "guide.ask": { en: "Click where {slot} stands", th: "คลิกตำแหน่งที่ {slot} ต้องยืน" },
  "guide.right": { en: "Correct", th: "ถูกต้อง" },
  "guide.shown": { en: "This is the spot", th: "นี่คือตำแหน่งที่ถูก" },
  "guide.noSpot": {
    en: "{slot} has nowhere particular to be here",
    th: "ท่านี้ไม่มีตำแหน่งเฉพาะสำหรับ {slot}",
  },
  "guide.notThere": { en: "Not there yet", th: "ยังไม่ใช่ตรงนั้น" },
  "guide.giveUp": { en: "Show me the answer", th: "ยอมแพ้ ขอดูคำตอบ" },
  "guide.dies": { en: "People die by", th: "ตายเพราะ" },
  "guide.variants": { en: "Which one", th: "รูปแบบ" },
  "guide.plan": { en: "Waymarks", th: "แผนมาร์ค" },
  "guide.nth": { en: "{n} of {of}", th: "ครั้งที่ {n} จาก {of}" },
  "guide.alsoAt": { en: "Also at", th: "ครั้งอื่น" },
  "guide.scored": { en: "{r}/{a} right", th: "{r}/{a} ถูก" },
  "guide.title": { en: "Guides", th: "ไกด์คอนเทนต์" },
  "guide.all": { en: "All guides", th: "ไกด์ทั้งหมด" },
  "guide.none": { en: "Nothing yet", th: "ยังไม่มี" },
  "guide.draftTag": { en: "draft", th: "ร่าง" },
  "guide.closed": {
    en: "Still being written — it opens to the FC when the first one is finished.",
    th: "กำลังเขียนอยู่ครับ — จะเปิดให้ทุกคนอ่านเมื่อไกด์แรกเสร็จ",
  },
  "guide.closedOne": {
    en: "Still being written — it opens to the FC when this one is finished.",
    th: "กำลังเขียนอยู่ครับ — จะเปิดให้ทุกคนอ่านเมื่อไกด์นี้เสร็จ",
  },
  "guide.credit": {
    en: "Based on {name} — the skill names and their order come from there, with thanks.",
    th: "อ้างอิงจาก {name} — ชื่อท่าและลำดับมาจากที่นั่น ขอบคุณครับ",
  },
  "guide.draftTitle": {
    en: "Still a draft — do not trust the positions yet",
    th: "ยังเป็นร่าง — อย่าเพิ่งเชื่อตำแหน่ง",
  },
  "guide.draftBody": {
    en: "The skill names and the order are right. The exact spots are a reconstruction and have not been checked against a pull, so read it for the shape of the fight rather than standing where it says.",
    th: "ชื่อท่าและลำดับถูกต้องตามต้นทาง แต่พิกัดที่ยืนยังเป็นการกะเอา ยังไม่ได้ตรวจกับการลงจริง ใช้ดูโครงว่าไฟต์เป็นยังไงได้ แต่อย่าเอาไปยืนตาม",
  },
  "guide.unwritten": {
    en: "The strategy for this one is not written yet — the skill and its timing are here, the rest is coming.",
    th: "ท่านี้ยังไม่ได้เขียนวิธีเล่น — มีแค่ชื่อกับเวลาไว้ก่อน เดี๋ยวมาเติม",
  },
  "feedback.title": { en: "Feedback", th: "แจ้งเรื่องถึงผู้ดูแล" },
  "feedback.intro": {
    en: "Anything the FC should know, or anything on this site that is wrong. It goes to the admins and stays between you and them.",
    th: "มีอะไรอยากบอก FC หรือเจออะไรผิดพลาดในเว็บ ส่งมาได้เลย เรื่องนี้จะเห็นแค่คุณกับผู้ดูแลเท่านั้น",
  },
  "feedback.signIn": {
    en: "Sign in to send feedback — a thread needs somebody to reply to.",
    th: "เข้าสู่ระบบก่อนถึงจะส่งเรื่องได้ เพราะต้องมีคนให้ตอบกลับ",
  },
  "feedback.new": { en: "New thread", th: "เปิดเรื่องใหม่" },
  "feedback.subject": { en: "What is this about?", th: "เรื่องอะไร" },
  "feedback.body": { en: "Tell them the rest…", th: "เล่ารายละเอียด…" },
  "feedback.imageOpen": {
    en: "Attached picture",
    th: "รูปที่แนบมา",
  },
  "feedback.attachTitle": {
    en: "Drag & drop a screenshot",
    th: "ลากรูปมาวางเพื่อแนบ",
  },
  "feedback.attachLimit": {
    en: "up to {n} pictures",
    th: "แนบได้สูงสุด {n} รูป",
  },
  "feedback.attachMore": {
    en: "Drop another",
    th: "วางเพิ่มได้อีก",
  },
  "feedback.tooMany": {
    en: "Up to {n} pictures on one message",
    th: "แนบได้สูงสุด {n} รูปต่อหนึ่งข้อความ",
  },
  "feedback.noBucket": {
    en: "Attachment storage is not set up yet — tell an admin",
    th: "ที่เก็บไฟล์แนบยังไม่ถูกตั้งค่า แจ้งแอดมินได้เลย",
  },
  "feedback.reply": { en: "Write a reply…", th: "เขียนตอบกลับ…" },
  "feedback.send": { en: "Send", th: "ส่ง" },
  "feedback.pick": { en: "Pick a thread to read it.", th: "เลือกเรื่องที่ต้องการอ่าน" },
  "feedback.empty": {
    en: "You have not sent anything yet.",
    th: "คุณยังไม่เคยส่งเรื่องเข้ามา",
  },
  "feedback.emptyAdmin": {
    en: "Nobody has sent anything yet.",
    th: "ยังไม่มีใครส่งเรื่องเข้ามา",
  },
  "feedback.close": { en: "Mark as done", th: "ปิดเรื่อง" },
  "feedback.reopen": { en: "Reopen", th: "เปิดเรื่องใหม่" },
  "feedback.closed": { en: "Done", th: "ปิดแล้ว" },
  "feedback.member": { en: "Member", th: "สมาชิก" },
  "feedback.adminSide": { en: "Admin", th: "ผู้ดูแล" },
  "feedback.you": { en: "you", th: "คุณ" },
  "notif.feedback": {
    // Named, now that the face beside it is theirs. "New message in feedback"
    // was the one line in the panel that said nothing about who.
    en: "{who} wrote on the feedback page.",
    th: "{who} เขียนข้อความในหน้า Feedback",
  },
  "nav.myPage": { en: "My page", th: "หน้าของคุณ" },
  "member.achvKept": {
    en: "Private now — last read earlier",
    th: "ตอนนี้ปิดอยู่ — ข้อมูลจากที่อ่านไว้ก่อนหน้า",
  },
  "member.achvKeptOn": {
    en: "Private now — read {on}",
    th: "ตอนนี้ปิดอยู่ — อ่านไว้เมื่อ {on}",
  },
  "member.achvPrivate": {
    en: "Achievements private",
    th: "ตั้ง Achievement เป็นส่วนตัว",
  },
  "member.collectUnknown": {
    en: "Not on FFXIV Collect yet",
    th: "ยังไม่มีข้อมูลใน FFXIV Collect",
  },
  "nav.editProfile": { en: "Edit profile", th: "แก้ไขโปรไฟล์" },
  "nav.admin": { en: "Admin panel", th: "หน้าผู้ดูแล" },
  "nav.language": { en: "Language", th: "ภาษา" },
  "nav.gallery": { en: "Gallery", th: "แกลเลอรี" },
  /* The header tab only. The page is still called the gallery everywhere it is
     linked to from inside the site; this is the one place that has to warn
     somebody before they arrive. */
  "nav.guidesWip": { en: "Guides (WIP)", th: "ไกด์ (WIP)" },
  "nav.party": { en: "Party finder", th: "หาปาร์ตี้" },

  // ── Gallery ─────────────────────────────────────────────────────────
  "gallery.eyebrow": { en: "Gallery", th: "แกลเลอรี" },
  "gallery.title": { en: "Screenshots", th: "รูปจากสมาชิก" },
  "gallery.intro": {
    en: "GPose shots and anything else worth showing. Click a picture to open it, leave a popoto or a comment, or copy a link to send to somebody.",
    th: "รูป GPose หรืออะไรก็ตามที่อยากอวด กดที่รูปเพื่อเปิดดู แล้วให้ popoto คอมเมนต์ หรือก็อปลิงก์ไปส่งให้คนอื่นดูได้",
  },
  "gallery.empty": {
    en: "Nothing here yet — be the first to post something.",
    th: "ยังไม่มีรูปเลย เป็นคนแรกก็ได้นะ",
  },
  "gallery.post": { en: "Post a picture", th: "โพสต์รูป" },
  "gallery.posting": { en: "Posting…", th: "กำลังโพสต์…" },
  "gallery.choose": { en: "Choose a picture", th: "เลือกรูป" },
  "gallery.limits": { en: "PNG or JPG, up to 8MB", th: "PNG หรือ JPG ไม่เกิน 8MB" },
  "gallery.captionPlaceholder": {
    en: "Say something about it (optional)",
    th: "เขียนอะไรสักหน่อยก็ได้ (ไม่ใส่ก็ได้)",
  },
  "gallery.notImage": { en: "That is not an image", th: "ไฟล์นี้ไม่ใช่รูป" },
  "gallery.tooBig": { en: "Too big — the limit is 8MB", th: "ไฟล์ใหญ่เกิน จำกัดที่ 8MB" },
  "gallery.noBucket": {
    en: "Storage is not set up yet — run supabase/migration_v9.sql",
    th: "ยังไม่ได้ตั้งค่าที่เก็บไฟล์ — ต้องรัน supabase/migration_v9.sql ก่อน",
  },
  "gallery.gateAnon": {
    en: "Sign in to post a picture.",
    th: "ต้องเข้าสู่ระบบก่อนถึงจะโพสต์รูปได้",
  },
  "gallery.gateUnverified": {
    en: "Posting needs a character you have verified as yours — it takes a minute.",
    th: "การโพสต์ต้องยืนยันตัวละครของตัวเองก่อน ใช้เวลาแป๊บเดียว",
  },
  "gallery.popoto": { en: "Send popoto", th: "Send popoto" },
  "gallery.popotoSent": { en: "Popoto sent", th: "ส่ง popoto แล้ว" },
  "gallery.share": { en: "Copy link", th: "ก็อปลิงก์" },
  "gallery.copied": { en: "Link copied", th: "ก็อปแล้ว" },
  "gallery.comments": { en: "Comments", th: "คอมเมนต์" },
  "gallery.noComments": { en: "No comments yet", th: "ยังไม่มีคอมเมนต์" },
  "gallery.writeComment": { en: "Write a comment…", th: "เขียนคอมเมนต์…" },
  "gallery.send": { en: "Send", th: "ส่ง" },
  "gallery.signInToReact": {
    en: "Sign in to leave a popoto or a comment",
    th: "เข้าสู่ระบบเพื่อให้ popoto หรือคอมเมนต์",
  },
  "gallery.byMember": { en: "Screenshots", th: "รูปที่โพสต์ไว้" },
  "gallery.hide": { en: "Hide", th: "ซ่อน" },
  "gallery.hideThisOne": { en: "Hide this picture", th: "ซ่อนรูปนี้" },
  "gallery.confirmHidePost": {
    en: "Hide this post? It comes off the gallery and off the member page, and you can put it back whenever you like.",
    th: "ซ่อนโพสต์นี้ไหม? มันจะหายไปจากแกลเลอรีและหน้าสมาชิก แต่เอากลับมาเมื่อไหร่ก็ได้",
  },
  "gallery.confirmHideImage": {
    en: "Hide this picture? The rest of the post stays where it is.",
    th: "ซ่อนรูปนี้ไหม? รูปอื่นในโพสต์ยังอยู่เหมือนเดิม",
  },
  "gallery.confirmDeletePost": {
    en: "Delete this post for good? The pictures, the popoto and the comments all go with it, and none of it comes back.",
    th: "ลบโพสต์นี้ถาวรไหม? รูป popoto และคอมเมนต์จะหายไปทั้งหมด และเอากลับมาไม่ได้",
  },
  "gallery.confirmDeleteImage": {
    en: "Delete this picture for good? Hiding it instead keeps it, and you can put it back later.",
    th: "ลบรูปนี้ถาวรไหม? ถ้าเลือกซ่อนแทน รูปจะยังอยู่และเอากลับมาได้ทีหลัง",
  },
  "gallery.hiddenByAdmin": {
    en: "An admin took this down. Only an admin can put it back.",
    th: "แอดมินเอาโพสต์นี้ลง มีแต่แอดมินที่เอากลับมาได้",
  },
  "gallery.hiddenByYou": {
    en: "Only you can see this. Restore it to put it back on the wall.",
    th: "ตอนนี้มีแค่คุณที่เห็น กด \"เอากลับมา\" เพื่อให้มันกลับไปอยู่บนหน้าแกลเลอรี",
  },
  "gallery.restore": { en: "Restore", th: "เอากลับมา" },
  "gallery.hiddenTag": { en: "Hidden", th: "ซ่อนอยู่" },
  "gallery.editCaption": { en: "Edit caption", th: "แก้คำบรรยาย" },
  "gallery.save": { en: "Save", th: "บันทึก" },
  "gallery.noCaption": { en: "No caption", th: "ยังไม่มีคำบรรยาย" },
  "gallery.search": {
    en: "Search captions or who posted…",
    th: "ค้นจากคำบรรยาย หรือชื่อคนโพสต์…",
  },
  "gallery.sortHot": { en: "Hot right now", th: "Hot right now" },
  "gallery.sortNew": { en: "Newest", th: "Newest" },
  "gallery.sortTop": { en: "Most popoto", th: "Most popoto" },
  "gallery.loadingMore": { en: "Loading more…", th: "กำลังโหลดเพิ่ม…" },
  /* Names who took them rather than how they are doing. "What is popular" is a
     ranking, and a ranking invites people to check where theirs came — which is
     not what a wall of screenshots from your own FC is for. */
  "gallery.hotHeading": {
    en: "Snapshots from the FC",
    th: "ภาพจากเพื่อนๆ ใน FC",
  },
  "gallery.seeAll": { en: "See all", th: "ดูทั้งหมด" },
  "gallery.hotHow": {
    en: "How does Hot right now decide?",
    th: "Hot right now เรียงยังไง?",
  },
  "lb.howScored": {
    en: "How is this scored?",
    th: "คะแนนคิดยังไง?",
  },
  "lb.rowMeasure": {
    en: "{p} points from {n} rare achievements",
    th: "{p} แต้ม จาก achievement หายาก {n} รายการ",
  },
  "lb.ofDedicated": {
    en: "{s}% of holding every rare {k} achievement still worth chasing",
    th: "คิดเป็น {s}% ของการเก็บ achievement {k} หายากครบทุกอันที่ยังพอเก็บได้",
  },
  "lb.pastCeiling": {
    en: "Past the {c} points that would take.",
    th: "เกินเพดาน {c} แต้มไปแล้ว",
  },
  // ── The poll on the gallery page ───────────────────────────────────
  "poll.heading": { en: "The FC is deciding", th: "FC กำลังโหวต" },
  "poll.daysLeft": { en: "{n} days left", th: "เหลืออีก {n} วัน" },
  "poll.hoursLeft": { en: "{n} hours left", th: "เหลืออีก {n} ชั่วโมง" },
  "poll.closed": { en: "closed", th: "ปิดโหวตแล้ว" },
  "poll.oneEach": { en: "One vote each.", th: "โหวตได้คนละ 1 สิทธิ์" },
  "poll.canChange": {
    en: "Your answer is in. You can change it until the poll closes.",
    th: "บันทึกคำตอบแล้ว เปลี่ยนใจได้จนกว่าจะปิดโหวต",
  },
  "poll.votes": { en: "{n} votes", th: "{n} เสียง" },
  "poll.signIn": {
    en: "Sign in to vote.",
    th: "เข้าสู่ระบบเพื่อโหวต",
  },
  "poll.needCharacter": {
    en: "Claim and verify your character to vote — this decides a leaderboard, so one vote has to mean one member.",
    th: "ต้องอ้างสิทธิ์และยืนยันตัวละครก่อนจึงจะโหวตได้ เพราะผลโหวตมีผลกับ leaderboards หนึ่งเสียงจึงต้องเท่ากับหนึ่งคน",
  },
  // ── Who gave the potatoes ──────────────────────────────────────────
  "popoto.whoGave": { en: "{n} popoto, from", th: "popoto {n} ครั้ง จาก" },
  "popoto.seeAll": { en: "Click to see all {n}", th: "กดเพื่อดูทั้ง {n} คน" },
  "lb.topTen": { en: "Top 10 in the FC", th: "10 อันดับแรกของ FC" },
  "lb.full": { en: "See all", th: "ดูทั้งหมด" },
  "lb.popoto": { en: "Popoto", th: "Popoto" },
  "lb.popotoHint": {
    en: "from Send popoto on their profile",
    th: "จากปุ่ม Send popoto ในหน้าโปรไฟล์",
  },
  "lb.gallery": { en: "Gallery popoto", th: "Popoto จากรูป" },
  "lb.galleryHint": {
    en: "shared between everybody in each picture",
    th: "แบ่งกันทุกคนที่อยู่ในรูป",
  },
  "gallery.cover": { en: "Cover", th: "รูปหน้าปก" },
  "gallery.openPoster": { en: "Post a picture", th: "โพสต์รูป" },
  "gallery.closePoster": { en: "Not now", th: "ไว้ก่อน" },
  "gallery.top": { en: "Back to top", th: "กลับขึ้นบน" },
  "gallery.tagTitle": { en: "Who is in this picture", th: "ใครอยู่ในรูปนี้" },
  "gallery.tagHint": {
    en: "A picture you are tagged in appears on your page too — once you agree to it.",
    th: "รูปที่คุณถูกแท็กจะไปขึ้นที่หน้าของคุณด้วย หลังจากคุณกดยืนยันแล้ว",
  },
  "gallery.tagPending": { en: "waiting", th: "รอยืนยัน" },
  "gallery.tagConfirm": { en: "Confirm", th: "ยืนยัน" },
  "gallery.tagConfirmFor": { en: "Agree for them", th: "ยืนยันให้" },
  "gallery.tagRemove": { en: "Remove tag", th: "เอาแท็กออก" },
  "gallery.tagNone": { en: "Nobody tagged yet", th: "ยังไม่ได้แท็กใคร" },
  "gallery.tagWaitingYou": {
    en: "Somebody tagged you in this picture. It shows on your page only if you agree.",
    th: "มีคนแท็กคุณในรูปนี้ รูปจะไปขึ้นที่หน้าของคุณก็ต่อเมื่อคุณกดยืนยัน",
  },
  "gallery.pendingTitle": { en: "Tagged in a picture", th: "ถูกแท็กในรูป" },
  "gallery.pendingHint": {
    en: "Say yes and it joins your gallery. Say no and the tag is gone.",
    th: "ถ้ายืนยัน รูปจะไปอยู่ในแกลเลอรีของคุณ ถ้าไม่ แท็กจะถูกลบทิ้ง",
  },
  "gallery.pendingNone": {
    en: "Nothing waiting for you.",
    th: "ไม่มีรูปที่รอคุณยืนยัน",
  },
  "gallery.tagDecline": { en: "No thanks", th: "ไม่เอา" },
  "gallery.tagOnPhoto": { en: "Tag on the photo", th: "แท็กบนรูป" },
  "gallery.tagClickFace": {
    en: "Click the person in the picture",
    th: "คลิกที่ตัวคนในรูป",
  },
  "gallery.tagWho": { en: "Who is this?", th: "คนนี้คือใคร?" },
  "gallery.tagDone": { en: "Done", th: "เสร็จแล้ว" },
  "gallery.tagGuest": { en: "Guest", th: "ไม่ใช่สมาชิก FC" },
  "gallery.tagGuestAs": {
    en: "Not in the FC — tag as “{name}”",
    th: "ไม่ได้อยู่ใน FC — แท็กเป็น “{name}”",
  },
  "gallery.tagPinned": { en: "Pinned on the picture", th: "ปักหมุดไว้ในรูป" },
  "gallery.tagShowAll": { en: "Show everyone", th: "แสดงแท็กทั้งหมด" },
  "gallery.tagHideAll": { en: "Hide the tags", th: "ซ่อนแท็ก" },
  "notif.title": { en: "Notifications", th: "การแจ้งเตือน" },
  "notif.empty": { en: "Nothing new.", th: "ยังไม่มีอะไรใหม่" },
  "notif.back": { en: "Send one back", th: "ส่งคืนบ้าง" },
  "notif.backSending": { en: "Sending…", th: "กำลังส่ง…" },
  "notif.backDone": {
    en: "Sent back today",
    th: "วันนี้ส่ง popoto ให้แล้ว",
  },
  "notif.backAll": {
    en: "Send one back to all {n}",
    th: "ส่ง popoto คืนทั้งหมด ({n})",
  },
  "notif.clear": { en: "Clear", th: "เคลียร์" },
  "notif.clearTitle": {
    en: "Clear these from the bell. Nothing is deleted — they stay in "
        + "all notifications.",
    th: "เอาออกจากกระดิ่ง ไม่ได้ลบทิ้ง ยังดูได้ในการแจ้งเตือนทั้งหมด",
  },
  // The empty panel says which kind of empty it is. "Nothing new" after
  // pressing Clear reads as though the button threw the lot away, and the
  // whole point of this one is that it did not.
  "notif.emptyCleared": {
    en: "All clear. Everything is still below, in all notifications.",
    th: "เคลียร์หมดแล้ว ทุกอย่างยังอยู่ครบในการแจ้งเตือนทั้งหมด ด้านล่าง",
  },
  "notif.seeAll": {
    en: "Everything before this",
    th: "ดูการแจ้งเตือนทั้งหมด",
  },
  "notif.past": {
    en: "All notifications",
    th: "การแจ้งเตือนทั้งหมด",
  },
  "notif.pastNone": {
    en: "Nothing here yet.",
    th: "ยังไม่มีการแจ้งเตือน",
  },
  // The event line. Written as a running total rather than as "+1", because
  // the number somebody wants after a month of this is how many they have, and
  // "+1" makes them do the addition themselves every evening.
  "notif.evercold": {
    en: "Today's entry is yours — {n} in the draw so far 🥔",
    th: "ได้รับสิทธิ์ของวันนี้แล้ว — รวมทั้งหมด {n} สิทธิ์ 🥔",
  },
  // The event's own name, under the line rather than in it. A notification's
  // first line is what just happened; which draw it belongs to is the answer
  // to the next question, and putting both on one line makes the sentence
  // longer than the toast is wide.
  "notif.evercoldEvent": {
    en: "Popoto :Road to Evercold Event",
    th: "Popoto :Road to Evercold Event",
  },
  "adm.spanEvent": { en: "The event", th: "ช่วงกิจกรรม" },
  "notif.open": { en: "Open", th: "เปิดดู" },
  "notif.look": { en: "Look first", th: "ดูรูปก่อน" },
  "notif.tagged": {
    en: "{who} tagged you in a picture.",
    th: "{who} แท็กคุณในรูป",
  },
  "notif.commented": {
    en: "{who} commented on your picture.",
    th: "{who} คอมเมนต์รูปของคุณ",
  },
  "notif.popoto": {
    en: "{who} sent you a popoto.",
    th: "{who} ส่ง popoto ให้คุณ",
  },
  "notif.popotoPost": {
    en: "{who} sent a popoto to a picture you are in.",
    th: "{who} ส่ง popoto ให้รูปที่มีคุณอยู่",
  },
  "notif.announced": {
    en: "A new announcement from the admins.",
    th: "มีประกาศใหม่จาก Admin",
  },
  // Only ever shown to another admin: which of them wrote it is their business
  // and nobody else's.
  "notif.announcedBy": {
    en: "A new announcement from the admins ({who}).",
    th: "มีประกาศใหม่จาก Admin ({who})",
  },
  "notif.partyJoin": {
    en: "{who} asked to join your party.",
    th: "{who} ขอเข้าร่วมปาร์ตี้ของคุณ",
  },
  "notif.partyInvite": {
    en: "{who} invited you to a party.",
    th: "{who} ชวนคุณเข้าปาร์ตี้",
  },
  "notif.partyOk": {
    en: "{who} let you into the party.",
    th: "{who} รับคุณเข้าปาร์ตี้แล้ว",
  },
  "notif.partySeatGone": {
    en: "The seat you were asked about has been taken.",
    th: "ตำแหน่งที่คุณถูกชวนมาลง มีคนลงแล้ว",
  },
  "notif.partyIn": {
    en: "{who} joined your party.",
    th: "{who} เข้าร่วมปาร์ตี้ของคุณแล้ว",
  },
  "notif.partyOut": {
    en: "{who} left your party.",
    th: "{who} ออกจากปาร์ตี้ของคุณ",
  },
  "notif.partySoon": {
    en: "A party you are in starts within the hour.",
    th: "ปาร์ตี้ที่คุณอยู่กำลังจะเริ่มในอีกไม่ถึงชั่วโมง",
  },
  "notif.partyMention": {
    en: "{who} mentioned you in a party.",
    th: "{who} พูดถึงคุณในปาร์ตี้",
  },
  "notif.partyTalk": {
    en: "{who} said something in a party you are in.",
    th: "{who} ส่งข้อความในปาร์ตี้ที่คุณอยู่",
  },
  /* Said when a notification arrives of a kind this version does not know.
     Vague on purpose: claiming it is an announcement sends people looking
     through the announcements for something that is not in them. */
  "notif.something": {
    en: "Something happened.",
    th: "มีความเคลื่อนไหวใหม่",
  },
  /* ── The admin pages ───────────────────────────────────────────────
     Translated because the FC is Thai and an admin should not have to
     read a second language to run their own site. The audit log keeps
     its raw table names as a fallback: those are the database's words
     and translating them would make a search for one fail. */
  "adm.title": {
    en: "Site admin",
    th: "หน้าผู้ดูแลระบบ",
  },
  "adm.checking": {
    en: "Checking permissions…",
    th: "กำลังตรวจสอบสิทธิ์…",
  },
  "adm.denied": {
    en: "Admins only — if you should be an admin, run the grant statement at the end of supabase/schema.sql in the SQL Editor first.",
    th: "สำหรับผู้ดูแลเท่านั้น — ถ้าคุณควรเป็นผู้ดูแล ให้รันคำสั่ง grant ท้ายไฟล์ supabase/schema.sql ใน SQL Editor ก่อน",
  },
  "adm.poweredOff": {
    en: "Your admin powers are switched off, so you are seeing the site the way the rest of the FC does — and this page is not part of that. Turn them back on to carry on.",
    th: "ตอนนี้คุณปิดสิทธิ์ผู้ดูแลอยู่ จึงเห็นเว็บแบบเดียวกับสมาชิกทั่วไป — ซึ่งไม่มีหน้านี้ เปิดสิทธิ์กลับมาเพื่อใช้งานต่อ",
  },
  "adm.discord": {
    en: "FC Discord",
    th: "Discord ของ FC",
  },
  "adm.discordHint": {
    en: "Server ID (enable Server Widget in Discord first) + invite link — powers the widget on the home page",
    th: "Server ID (เปิด Server Widget ใน Discord ก่อน) และลิงก์เชิญ — ใช้แสดงกล่อง Discord บนหน้าแรก",
  },
  "adm.discordId": {
    en: "Discord Server ID",
    th: "Discord Server ID",
  },
  "adm.save": {
    en: "Save",
    th: "บันทึก",
  },
  "adm.saveFailed": {
    en: "Save failed: {why}",
    th: "บันทึกไม่สำเร็จ: {why}",
  },
  "adm.saved": {
    en: "Saved",
    th: "บันทึกแล้ว",
  },
  "adm.updates": {
    en: "Site updates (the box on the home page)",
    th: "อัพเดทเว็บ (กล่องบนหน้าแรก)",
  },
  "adm.updatesHint": {
    en: "One entry per day. Write each line in both languages — a reader sees the one they are reading the site in, and a line with only one side falls back to it rather than showing blank.",
    th: "หนึ่งรายการต่อหนึ่งวัน เขียนทุกบรรทัดทั้งสองภาษา — ผู้อ่านจะเห็นภาษาที่ตัวเองใช้อยู่ ถ้าเขียนไว้ภาษาเดียวระบบจะใช้ภาษานั้นแทนที่จะปล่อยว่าง",
  },
  "adm.editingDay": {
    en: "Editing an existing day",
    th: "กำลังแก้ไขรายการของวันที่มีอยู่แล้ว",
  },
  "adm.dayTitleTh": {
    en: "หัวข้อของวัน (ไม่ใส่ก็ได้)",
    th: "หัวข้อของวัน (ไม่ใส่ก็ได้)",
  },
  "adm.dayTitleEn": {
    en: "Headline for the day (optional)",
    th: "หัวข้อภาษาอังกฤษ (ไม่ใส่ก็ได้)",
  },
  "adm.lineTh": {
    en: "ข้อความภาษาไทย",
    th: "ข้อความภาษาไทย",
  },
  "adm.lineEn": {
    en: "The same line in English",
    th: "ข้อความเดียวกันเป็นภาษาอังกฤษ",
  },
  "adm.removeLine": {
    en: "Remove line",
    th: "ลบบรรทัด",
  },
  "adm.addLine": {
    en: "+ Add another line",
    th: "+ เพิ่มบรรทัด",
  },
  "adm.postUpdate": {
    en: "Post update",
    th: "โพสต์อัพเดท",
  },
  "adm.saveChanges": {
    en: "Save changes",
    th: "บันทึกการแก้ไข",
  },
  "adm.date": {
    en: "Date",
    th: "วันที่",
  },
  "adm.edit": {
    en: "Edit",
    th: "แก้ไข",
  },
  "adm.delete": {
    en: "Delete",
    th: "ลบ",
  },
  "adm.cancel": {
    en: "Cancel",
    th: "ยกเลิก",
  },
  "adm.needOneLine": {
    en: "Write at least one line first",
    th: "เขียนอย่างน้อยหนึ่งบรรทัดก่อน",
  },
  "adm.updateSaved": {
    en: "Update saved",
    th: "บันทึกอัพเดทแล้ว",
  },
  "adm.updatePosted": {
    en: "Update posted",
    th: "โพสต์อัพเดทแล้ว",
  },
  "adm.updateDeleted": {
    en: "Update deleted",
    th: "ลบอัพเดทแล้ว",
  },
  "adm.noTranslation": {
    en: "· missing a translation",
    th: "· ยังไม่มีคำแปล",
  },
  "adm.lines": {
    en: "{n} lines",
    th: "{n} บรรทัด",
  },
  "adm.noUpdates": {
    en: "Nothing here yet — the home page shows the list that ships with the code until the first one is written.",
    th: "ยังไม่มีอะไร — หน้าแรกจะแสดงรายการที่ติดมากับโค้ดจนกว่าจะมีการเขียนรายการแรก",
  },
  "adm.anns": {
    en: "FC announcements (featured card on the home page)",
    th: "ประกาศของ FC (กล่องเด่นบนหน้าแรก)",
  },
  "adm.editingAnn": {
    en: "Editing an existing announcement",
    th: "กำลังแก้ไขประกาศที่มีอยู่แล้ว",
  },
  "adm.annTitle": {
    en: "Announcement title",
    th: "หัวข้อประกาศ",
  },
  "adm.details": {
    en: "Details (optional)",
    th: "รายละเอียด (ไม่ใส่ก็ได้)",
  },
  "adm.postAnn": {
    en: "Post announcement",
    th: "โพสต์ประกาศ",
  },
  "adm.annPosted": {
    en: "Announcement posted",
    th: "โพสต์ประกาศแล้ว",
  },
  "adm.annUpdated": {
    en: "Announcement updated",
    th: "แก้ไขประกาศแล้ว",
  },
  "adm.annDeleted": {
    en: "Announcement deleted",
    th: "ลบประกาศแล้ว",
  },
  "adm.noAnns": {
    en: "No announcements yet",
    th: "ยังไม่มีประกาศ",
  },
  "adm.posts": {
    en: "Timeline posts (alongside official news)",
    th: "โพสต์ไทม์ไลน์ (แสดงร่วมกับข่าวทางการ)",
  },
  "adm.postTitle": {
    en: "Title",
    th: "หัวข้อ",
  },
  "adm.link": {
    en: "Link (optional)",
    th: "ลิงก์ (ไม่ใส่ก็ได้)",
  },
  "adm.postToTimeline": {
    en: "Post to timeline",
    th: "โพสต์ลงไทม์ไลน์",
  },
  "adm.posted": {
    en: "Posted to the timeline",
    th: "โพสต์ลงไทม์ไลน์แล้ว",
  },
  "adm.postUpdated": {
    en: "Post updated",
    th: "แก้ไขโพสต์แล้ว",
  },
  "adm.postDeleted": {
    en: "Post deleted",
    th: "ลบโพสต์แล้ว",
  },
  "adm.noPosts": {
    en: "No posts yet",
    th: "ยังไม่มีโพสต์",
  },
  "adm.board": {
    en: "Member board controls",
    th: "การจัดการรายชื่อสมาชิก",
  },
  "adm.searchMember": {
    en: "Search member name…",
    th: "ค้นหาชื่อสมาชิก…",
  },
  "adm.note": {
    en: "Internal note (optional)",
    th: "หมายเหตุภายใน (ไม่ใส่ก็ได้)",
  },
  "adm.hideFromBoard": {
    en: "Hide from board",
    th: "ซ่อนจากรายชื่อ",
  },
  "adm.keepVisible": {
    en: "Keep visible + save note",
    th: "แสดงต่อ + บันทึกหมายเหตุ",
  },
  "adm.hidden": {
    en: "Hidden from the board",
    th: "ซ่อนจากรายชื่อแล้ว",
  },
  "adm.savedVisible": {
    en: "Saved (still visible)",
    th: "บันทึกแล้ว (ยังแสดงอยู่)",
  },
  "adm.overrides": {
    en: "Active overrides",
    th: "รายการที่ตั้งค่าไว้",
  },
  "adm.isHidden": {
    en: "hidden",
    th: "ซ่อนอยู่",
  },
  "adm.clear": {
    en: "Clear",
    th: "ล้าง",
  },
  "adm.cleared": {
    en: "Override cleared",
    th: "ล้างการตั้งค่าแล้ว",
  },
  "adm.claims": {
    en: "Claimed characters",
    th: "ตัวละครที่อ้างสิทธิ์แล้ว",
  },
  "adm.claimCount": {
    en: "{n} characters have been claimed.",
    th: "มีตัวละครที่อ้างสิทธิ์แล้ว {n} ตัว",
  },
  "adm.colCharacter": {
    en: "Character",
    th: "ตัวละคร",
  },
  "adm.colProvider": {
    en: "Signed in with",
    th: "เข้าสู่ระบบด้วย",
  },
  "adm.colClaimed": {
    en: "Claimed",
    th: "วันที่อ้างสิทธิ์",
  },
  "adm.release": {
    en: "Release",
    th: "ปล่อยสิทธิ์",
  },
  "adm.released": {
    en: "Claim released",
    th: "ปล่อยสิทธิ์แล้ว",
  },
  "adm.noClaims": {
    en: "Nobody has claimed a character yet",
    th: "ยังไม่มีใครอ้างสิทธิ์ตัวละคร",
  },
  "adm.colLodestone": {
    en: "Lodestone",
    th: "Lodestone",
  },
  "adm.lodeYes": {
    en: "Verified",
    th: "ยืนยันแล้ว",
  },
  "adm.lodeNo": {
    en: "Not verified",
    th: "ยังไม่ยืนยัน",
  },
  "adm.lodeAll": {
    en: "All",
    th: "ทั้งหมด",
  },
  "adm.lodeOpen": {
    en: "Open this character on The Lodestone",
    th: "เปิดหน้าตัวละครนี้ใน Lodestone",
  },
  "adm.claimVerified": {
    en: "{n} verified on The Lodestone, {m} not.",
    th: "ยืนยันบน Lodestone แล้ว {n} · ยังไม่ยืนยัน {m}",
  },
  "member.achvPending": {
    en: "Achievements not read yet",
    th: "ยังไม่ได้อ่าน achievement",
  },
  "member.achvPendingNote": {
    en: "Nothing is hidden here — the board reads achievements through FFXIV Collect, which only re-reads a character when it is asked to, and it is asked once a day. Nothing to do; they will appear.",
    th: "ตัวละครนี้ไม่ได้ปิดอะไรไว้ — เว็ปอ่าน achievement ผ่าน FFXIV Collect ซึ่งจะอ่านใหม่ก็ต่อเมื่อมีคนสั่ง และระบบสั่งให้อ่านวันละครั้งอยู่แล้ว ไม่ต้องทำอะไร เดี๋ยวข้อมูลจะขึ้นเอง",
  },
  "board.loadingGuests": {
    en: "Loading guests…",
    th: "กำลังโหลดรายชื่อแขก…",
  },
  "adm.annEnOptional": {
    en: "optional; falls back to the Thai",
    th: "ไม่ใส่ก็ได้ จะใช้ภาษาไทยแทน",
  },
  "common.close": {
    en: "Close",
    th: "ปิด",
  },
  "palette.placeholder": {
    en: "Search a member, or jump to a page…",
    th: "ค้นหาสมาชิก หรือกระโดดไปหน้าอื่น…",
  },
  "palette.empty": {
    en: "Nobody by that name.",
    th: "ไม่มีใครชื่อนี้",
  },
  "palette.pages": {
    en: "Go to",
    th: "ไปที่",
  },
  "palette.members": {
    en: "Members",
    th: "สมาชิก",
  },
  "palette.hint": {
    en: "Search",
    th: "ค้นหา",
  },
  "pending.character": {
    en: "Character #{id}",
    th: "ตัวละคร #{id}",
  },
  "pending.badge": {
    en: "No data yet",
    th: "ยังไม่มีข้อมูล",
  },
  "pending.badgeUnverified": {
    en: "Claim not verified",
    th: "ยังไม่ได้ยืนยันตัวละคร",
  },
  "pending.body": {
    en: "This character is not on the Free Company roster, so the board has nothing for them yet. The site reads The Lodestone once a night — their world and Free Company will show up here after the next run.",
    th: "ตัวละครนี้ไม่ได้อยู่ในรายชื่อ FC เว็ปจึงยังไม่มีข้อมูล ระบบจะอ่านข้อมูลจาก Lodestone คืนละครั้ง โลกและ FC ของเขาจะขึ้นที่หน้านี้หลังรอบถัดไป",
  },
  "pending.bodyUnverified": {
    en: "Somebody has claimed this character but has not proved it is theirs yet. Until the code is on the Lodestone profile the site will not show anything under this name.",
    th: "มีคนอ้างสิทธิ์ตัวละครนี้ไว้ แต่ยังไม่ได้ยืนยันว่าเป็นของตัวเอง ตราบใดที่ยังไม่ได้วางโค้ดไว้ในหน้า Lodestone เว็ปจะยังไม่แสดงข้อมูลใดๆ ในชื่อนี้",
  },
  "pending.lodestone": {
    en: "View on The Lodestone",
    th: "ดูใน Lodestone",
  },
  "pending.verify": {
    en: "Verify a character",
    th: "ไปยืนยันตัวละคร",
  },
  "pending.back": {
    en: "Back to members",
    th: "กลับไปหน้าสมาชิก",
  },
  "adm.claimShown": {
    en: "Showing {n} of {all} claimed characters.",
    th: "แสดง {n} จาก {all} ตัวละครที่อ้างสิทธิ์แล้ว",
  },
  "adm.claimSearch": {
    en: "Search a character or login…",
    th: "ค้นหาชื่อตัวละครหรือบัญชี…",
  },
  "adm.claimNoMatch": {
    en: "Nobody matches this filter.",
    th: "ไม่มีใครตรงกับตัวกรองนี้",
  },
  "adm.guessed": {
    en: "Guessed from the avatar's host — run migration_v21.sql to record it properly",
    th: "เดาจากที่อยู่ของรูปโปรไฟล์ — รัน migration_v21.sql เพื่อบันทึกค่าจริง",
  },
  "kudos.signIn": {
    en: "Log in with Discord first",
    th: "เข้าสู่ระบบด้วย Discord ก่อน",
  },
  "kudos.needCharacter": {
    en: "Link your character first — go to your profile and claim the one you play.",
    th: "ผูกตัวละครก่อน — ไปที่หน้าโปรไฟล์แล้วเลือกตัวละครที่คุณเล่น",
  },
  "kudos.already": {
    en: "Already sent to this member today — come back tomorrow",
    th: "ส่งให้คนนี้ไปแล้ววันนี้ — พรุ่งนี้มาใหม่",
  },
  "kudos.failed": {
    en: "Could not send, try again",
    th: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง",
  },
  "kudos.sent": {
    en: "Popoto sent 🥔",
    th: "ส่ง popoto แล้ว 🥔",
  },
  // ── Custom badges ──────────────────────────────────────────────────
  // ── Polls ──────────────────────────────────────────────────────────
  "adm.poll": { en: "Poll", th: "โหวต" },
  "adm.pollHint": {
    en: "The question the FC is being asked on the gallery page, and how it is going. Individual answers are folded away below each poll, and the poll card tells members an admin can see them.",
    th: "คำถามที่ถาม FC อยู่ในหน้าแกลเลอรี และผลปัจจุบัน ส่วนคำตอบรายคนพับเก็บไว้ใต้แต่ละโหวต และการ์ดโหวตบอกสมาชิกไว้แล้วว่าแอดมินดูได้",
  },
  "adm.pollWhoVoted": { en: "Who voted what", th: "ใครโหวตอะไร" },
  "adm.pollNoVotes": { en: "Nobody has voted yet.", th: "ยังไม่มีใครโหวต" },
  "adm.pollNone": { en: "No polls.", th: "ยังไม่มีโหวต" },
  "adm.pollOpen": { en: "Open", th: "เปิดอยู่" },
  "adm.pollEnded": { en: "Ended", th: "จบแล้ว" },
  "adm.pollCloses": { en: "closes {when}", th: "ปิด {when}" },
  "adm.pollVotes": { en: "{n} votes", th: "{n} เสียง" },
  "adm.pollClose": { en: "End it now", th: "ปิดโหวตเลย" },
  "adm.pollClosed": { en: "Poll ended", th: "ปิดโหวตแล้ว" },
  "adm.pollConfirmClose": {
    en: "End this poll now? The result stays on the gallery page and nobody can change their answer after this.",
    th: "ปิดโหวตเลยไหม? ผลจะยังอยู่ในหน้าแกลเลอรี และหลังจากนี้จะเปลี่ยนคำตอบไม่ได้แล้ว",
  },
  "adm.badges": { en: "Badges", th: "Badge" },
  "adm.badgesHint": {
    en: "Make a badge once, then give it to as many members as you like. It shows in full on their own page and as a chip at the end of their row on the member list.",
    th: "สร้าง badge หนึ่งครั้ง แล้วมอบให้สมาชิกกี่คนก็ได้ จะแสดงแบบเต็มในหน้าโปรไฟล์ของเขา และแสดงแบบย่อท้ายแถวในหน้ารายชื่อสมาชิก",
  },
  "adm.badgeLabel": { en: "Badge text (TH)", th: "ข้อความบน badge (ไทย)" },
  "adm.badgeLabelEn": { en: "Badge text (EN)", th: "ข้อความบน badge (อังกฤษ)" },
  "adm.badgeDesc": { en: "What it is for, TH (optional)", th: "ให้เพราะอะไร ไทย (ไม่ใส่ก็ได้)" },
  "adm.badgeDescEn": { en: "What it is for, EN (optional)", th: "ให้เพราะอะไร อังกฤษ (ไม่ใส่ก็ได้)" },
  "adm.badgeIcon": { en: "Icon (optional)", th: "ไอคอน (ไม่ใส่ก็ได้)" },
  "adm.badgeIconHint": {
    en: "256×256 PNG, square, transparent background. It sits on a light metal plate, so dark artwork reads best. It is drawn at about 30px, so keep the shape simple — fine detail turns to mush. Under 100 KB: it loads on the member list for everyone holding this badge.",
    th: "PNG 256×256 สี่เหลี่ยมจัตุรัส พื้นหลังโปร่งใส วางอยู่บนแผ่นโลหะสีอ่อน ลายเส้นสีเข้มจะชัดที่สุด แสดงจริงราว 30px ลายควรเรียบๆ ถ้ารายละเอียดเยอะจะเละ ไฟล์ไม่ควรเกิน 100 KB เพราะโหลดในหน้ารายชื่อของทุกคนที่ถือ badge นี้",
  },
  "adm.badgePreview": { en: "Preview", th: "ตัวอย่าง" },
  "adm.badgeNew": { en: "New badge", th: "สร้าง badge ใหม่" },
  "adm.badgeEditing": { en: "Editing “{label}”", th: "กำลังแก้ไข “{label}”" },
  "adm.badgeSaved": { en: "Badge updated", th: "บันทึก badge แล้ว" },
  "adm.badgeNoteEdit": { en: "Edit the reason", th: "แก้เหตุผล" },
  "adm.badgeNoteSaved": { en: "Reason updated", th: "แก้เหตุผลแล้ว" },
  "adm.badgeCreate": { en: "Create badge", th: "สร้าง badge" },
  "adm.badgeCreated": { en: "Badge created", th: "สร้าง badge แล้ว" },
  "adm.badgeNone": { en: "No badges yet.", th: "ยังไม่มี badge" },
  "adm.badgeHolderCount": { en: "{n} member(s) have it", th: "มี {n} คนได้รับ" },
  "adm.badgeGive": { en: "Give to a member", th: "มอบให้สมาชิก" },
  "adm.badgeDone": { en: "Done", th: "เสร็จแล้ว" },
  "adm.badgeNote": { en: "Why this member (optional)", th: "เหตุผลเฉพาะคนนี้ (ไม่ใส่ก็ได้)" },
  "adm.badgeGiven": { en: "Given to {name}", th: "มอบให้ {name} แล้ว" },
  "adm.badgeTake": { en: "Take it back", th: "เรียกคืน" },
  "adm.badgeTaken": { en: "Taken back", th: "เรียกคืนแล้ว" },
  "adm.badgeDelete": { en: "Delete", th: "ลบ" },
  "adm.badgeDeleted": { en: "Badge deleted", th: "ลบ badge แล้ว" },
  "adm.badgeConfirmDelete": {
    en: "Delete the badge “{label}”? {n} member(s) are wearing it and will lose it.",
    th: "ลบ badge “{label}” ใช่ไหม? มี {n} คนที่ถืออยู่และจะหายไปด้วย",
  },
  "adm.badgeConfirmTake": {
    en: "Take “{label}” back from {name}?",
    th: "เรียก “{label}” คืนจาก {name} ใช่ไหม?",
  },
  "member.badges": { en: "Badges", th: "Badge" },
  "member.mostPlayed": { en: "Most played", th: "อาชีพที่เล่นบ่อยที่สุด" },
  "member.killsUnit": { en: "kills", th: "ครั้งที่ฆ่า" },
  "member.otherJobs": { en: "{n} other jobs", th: "อีก {n} อาชีพ" },

  "adm.reports": {
    en: "Popoto: Road to Evercold",
    th: "Popoto: Road to Evercold",
  },
  "adm.noCharacter": {
    en: "no character",
    th: "ยังไม่ผูกตัวละคร",
  },
  "adm.rpPopoto": {
    en: "Popoto: Road to Evercold Event",
    th: "Popoto: Road to Evercold Event",
  },
  "adm.rpPopotoNote": {
    en: "one day of giving is one entry, however many were given that day — it counts only what somebody gave to other people: not what they were given, and not what they gave themselves",
    th: "ส่งในหนึ่งวัน = 1 สิทธิ์ ไม่ว่าวันนั้นจะส่งกี่ครั้ง — นับเฉพาะที่ส่งให้คนอื่น ไม่นับที่คนอื่นส่งให้ และไม่นับที่ส่งให้ตัวเอง",
  },
  "adm.rpPopotoParts": {
    en: "(on other people's profiles / on other people's pictures)",
    th: "(ให้โปรไฟล์คนอื่น / ให้รูปคนอื่น)",
  },
  "adm.rpSummary": {
    en: "{entries} entries · {people} people · {n} popoto given",
    th: "{entries} สิทธิ์ · {people} คน · ส่ง popoto รวม {n} ครั้ง",
  },
  "adm.scopeFc": {
    en: "In the FC",
    th: "อยู่ใน FC",
  },
  "adm.scopeOut": {
    en: "Outside the FC",
    th: "นอก FC",
  },
  "adm.scopeAll": {
    en: "Everyone",
    th: "ทั้งหมด",
  },
  "adm.rpHidden": {
    en: "· {n} more from outside the FC, not counted",
    th: "· อีก {n} สิทธิ์จากคนนอก FC ไม่ถูกนับ",
  },
  "adm.rpDays": {
    en: "{n} entries",
    th: "{n} สิทธิ์",
  },
  "adm.drawHint": {
    en: "Each day somebody gave is one entry, and nobody can win twice.",
    th: "ทุกวันที่ส่ง popoto = 1 สิทธิ์ และคนหนึ่งจะถูกสุ่มได้ครั้งเดียว",
  },
  "adm.rpEmpty": {
    en: "Nobody gave one in these days.",
    th: "ไม่มีใครส่ง popoto ในช่วงวันที่เลือก",
  },
  "adm.drawTitle": {
    en: "Draw",
    th: "สุ่มผู้โชคดี",
  },
  "adm.drawHowMany": {
    en: "How many",
    th: "จำนวนคน",
  },
  "adm.drawOf": {
    en: "of {n}",
    th: "จาก {n} คน",
  },
  "adm.draw": {
    en: "Draw",
    th: "สุ่ม",
  },
  "adm.drawAgain": {
    en: "Draw again",
    th: "สุ่มใหม่",
  },
  "adm.drawClear": {
    en: "Clear",
    th: "ล้าง",
  },
  "adm.onlyDeleted": {
    en: "Deleted only",
    th: "เฉพาะที่ถูกลบ",
  },
  "adm.restore": { en: "Restore", th: "กู้คืน" },
  "adm.restoring": { en: "Restoring…", th: "กำลังกู้คืน…" },
  "adm.restoreConfirm": {
    en: "Put this {what} back exactly as it was?",
    th: "กู้ {what} นี้กลับมาเหมือนเดิมทุกอย่างไหม?",
  },
  "adm.log": {
    en: "Activity log",
    th: "บันทึกการใช้งาน",
  },
  "adm.logHint": {
    en: "Every insert, change and deletion, recorded by the database itself.",
    th: "ทุกการเพิ่ม แก้ไข และลบ บันทึกโดยฐานข้อมูลเอง",
  },
  "adm.who": {
    en: "Who…",
    th: "ใคร…",
  },
  "adm.anything": {
    en: "Anything",
    th: "ทั้งหมด",
  },
  "adm.from": {
    en: "From",
    th: "ตั้งแต่",
  },
  "adm.to": {
    en: "to",
    th: "ถึง",
  },
  "adm.spanToday": {
    en: "Today",
    th: "วันนี้",
  },
  "adm.span7": {
    en: "7 days",
    th: "7 วัน",
  },
  "adm.span30": {
    en: "30 days",
    th: "30 วัน",
  },
  "adm.anyDate": {
    en: "Any date",
    th: "ทุกวัน",
  },
  "adm.system": {
    en: "the system",
    th: "ระบบ",
  },
  "adm.detail": {
    en: "detail",
    th: "รายละเอียด",
  },
  "adm.less": {
    en: "less",
    th: "ย่อ",
  },
  "adm.nothingLogged": {
    en: "Nothing recorded yet.",
    th: "ยังไม่มีบันทึก",
  },
  "adm.loadMore": {
    en: "Load more",
    th: "โหลดเพิ่ม",
  },
  "adm.loading": {
    en: "Loading…",
    th: "กำลังโหลด…",
  },
  "adm.opInsert": {
    en: "added",
    th: "เพิ่ม",
  },
  "adm.opUpdate": {
    en: "changed",
    th: "แก้ไข",
  },
  "adm.opDelete": {
    en: "removed",
    th: "ลบ",
  },
  "adm.ofWhom": {
    en: "of",
    th: "ของ",
  },
  "adm.toWhom": {
    en: "to",
    th: "ให้",
  },
  "adm.onWhat": {
    en: "on",
    th: "ที่",
  },
  "adm.picture": {
    en: "picture #{n}",
    th: "รูป #{n}",
  },
  "adm.popotoAny": {
    en: "a popoto (either kind)",
    th: "popoto (ทั้งสองแบบ)",
  },
  "adm.thKudos": {
    en: "a popoto on a profile",
    th: "popoto ที่หน้าโปรไฟล์",
  },
  "adm.thLikes": {
    en: "a popoto on a picture",
    th: "popoto ที่รูปภาพ",
  },
  "adm.thPost": {
    en: "a gallery post",
    th: "โพสต์ในแกลเลอรี",
  },
  "adm.thImage": {
    en: "a picture",
    th: "รูปภาพ",
  },
  "adm.thTag": {
    en: "a tag",
    th: "การแท็ก",
  },
  "adm.thComment": {
    en: "a comment",
    th: "คอมเมนต์",
  },
  "adm.thProfile": {
    en: "a profile",
    th: "โปรไฟล์",
  },
  "adm.thAnn": {
    en: "an announcement",
    th: "ประกาศ",
  },
  "adm.thSetting": {
    en: "a site setting",
    th: "การตั้งค่าเว็บ",
  },
  "adm.thOverride": {
    en: "a member override",
    th: "การตั้งค่ารายชื่อสมาชิก",
  },
  "adm.thTimeline": {
    en: "a timeline post",
    th: "โพสต์ไทม์ไลน์",
  },
  "adm.thThread": {
    en: "a feedback thread",
    th: "เรื่องใน Feedback",
  },
  "adm.thMessage": {
    en: "a feedback message",
    th: "ข้อความใน Feedback",
  },
  "adm.thUpdate": {
    en: "a site update",
    th: "อัพเดทเว็บ",
  },
  "admin.modeTitle": { en: "Admin powers", th: "สิทธิ์แอดมิน" },
  "admin.modeOn": { en: "Admin powers on", th: "เปิดสิทธิ์แอดมินอยู่" },
  "admin.modeOff": { en: "Browsing as a member", th: "กำลังดูแบบสมาชิกทั่วไป" },
  "profile.pictures": { en: "Your pictures", th: "รูปของคุณ" },
  "profile.picturesHint": {
    en: "Your portrait is used everywhere the site names you. Your cover only sits at the top of your own page.",
    th: "รูปโปรไฟล์จะถูกใช้ทุกที่ที่เว็บแสดงชื่อคุณ ส่วนรูปปกจะขึ้นแค่ด้านบนหน้าตัวเองเท่านั้น",
  },
  "profile.picAvatar": { en: "Portrait", th: "รูปโปรไฟล์" },
  "profile.picCover": { en: "Cover", th: "รูปปก" },
  "profile.picFromGallery": { en: "From the gallery", th: "เลือกจากแกลเลอรี" },
  "profile.picCoverDrop": {
    en: "Drag & drop your banner here",
    th: "ลากรูปแบนเนอร์มาวางตรงนี้",
  },
  "profile.picUpload": {
    en: "Upload a file",
    th: "อัปโหลดไฟล์",
  },
  "profile.picAvatarDrop": {
    en: "Drag & drop a new portrait",
    th: "ลากรูปโปรไฟล์มาวางตรงนี้",
  },
  "profile.picCoverSwap": {
    en: "Drag & drop to replace the banner",
    th: "ลากรูปมาวางเพื่อเปลี่ยนแบนเนอร์",
  },
  "profile.shareDrop": {
    en: "Drag & drop a picture for the card",
    th: "ลากรูปสำหรับการ์ดมาวางตรงนี้",
  },
  "profile.shareSwap": {
    en: "Drag & drop to replace the card picture",
    th: "ลากรูปมาวางเพื่อเปลี่ยนรูปการ์ด",
  },
  "profile.picSquareHint": {
    en: "Square works best — it is cropped to a circle",
    th: "รูปสี่เหลี่ยมจัตุรัสดีที่สุด เพราะจะถูกตัดเป็นวงกลม",
  },
  "profile.picWideHint": {
    en: "A wide picture works best",
    th: "รูปแนวนอนจะเข้ากรอบได้สวยที่สุด",
  },
  "profile.picDropHint": {
    en: "Drag a picture onto any of them to replace it.",
    th: "ลากรูปมาวางทับรูปไหนก็ได้เพื่อเปลี่ยนรูปนั้น",
  },
  "profile.picRemove": { en: "Take it down", th: "เอาออก" },
  "profile.picYours": { en: "Yours", th: "รูปที่คุณเลือกเอง" },
  "profile.picDefault": {
    en: "The Lodestone's, until you choose one",
    th: "ใช้รูปจาก Lodestone อยู่ จนกว่าคุณจะเลือกเอง",
  },
  "profile.picNone": { en: "None yet", th: "ยังไม่มี" },
  "profile.picZoom": { en: "Zoom", th: "ย่อ/ขยาย" },
  "profile.picSmall": {
    en: "This picture is smaller than the size the site uses, so it will look soft. A larger screenshot will come out sharper.",
    th: "รูปนี้เล็กกว่าขนาดที่เว็บใช้ ภาพจะดูเบลอนิดหน่อย ถ้าใช้ภาพที่ใหญ่กว่านี้จะคมกว่า",
  },
  "profile.picSaving": { en: "Saving…", th: "กำลังบันทึก…" },
  "profile.picNoShots": {
    en: "Nothing in the gallery yet — post a picture first, or upload a file.",
    th: "ยังไม่มีรูปในแกลเลอรี ลองโพสต์รูปก่อน หรืออัพโหลดไฟล์เอง",
  },
  "profile.picFetchFailed": {
    en: "That picture could not be opened. Try uploading it instead.",
    th: "เปิดรูปนั้นไม่ได้ ลองอัพโหลดไฟล์แทน",
  },
  "profile.shareCard": { en: "Sharing your page", th: "การ์ดตอนแชร์ลิงก์" },
  "profile.shareFresh": { en: "Copy a fresh link", th: "ก็อปลิงก์ใหม่" },
  "profile.shareFreshHint": {
    en: "Discord remembers links it has already shown. This one it has not seen, so it will fetch your card again.",
    th: "Discord จำลิงก์ที่เคยแสดงไปแล้ว ลิงก์นี้มันยังไม่เคยเห็น เลยจะไปดึงการ์ดของคุณมาใหม่",
  },
  "profile.shareOwn": {
    en: "Using its own picture",
    th: "ใช้รูปของการ์ดนี้เอง",
  },
  "profile.shareFromCover": {
    en: "Using your cover — set one cut for this shape if the edges get lost",
    th: "ใช้รูปปกอยู่ — ถ้าขอบภาพโดนตัดหาย ตั้งรูปเฉพาะของการ์ดนี้ได้",
  },
  "profile.shareCardHint": {
    en: "This is what Discord shows when somebody pastes a link to your page. It follows your portrait and cover.",
    th: "นี่คือสิ่งที่ Discord จะแสดงเวลามีคนแปะลิงก์หน้าของคุณ จะเปลี่ยนตามรูปโปรไฟล์และรูปปกที่คุณตั้งไว้",
  },
  "gallery.postFor": { en: "Post for a member", th: "โพสต์ให้สมาชิกคนอื่น" },
  "gallery.postForHint": {
    en: "Admins only. The picture lands on that member's page and is credited to them, with you recorded as the account that uploaded it.",
    th: "เฉพาะ admin รูปจะไปขึ้นที่หน้าของสมาชิกคนนั้นและให้เครดิตเขา โดยระบบบันทึกว่าบัญชีคุณเป็นคนอัป",
  },
  "gallery.postForMe": { en: "Post as myself", th: "โพสต์ในนามตัวเอง" },
  "gallery.findMember": { en: "Type a character name…", th: "พิมพ์ชื่อตัวละคร…" },
  "gallery.morePictures": { en: "{n} pictures", th: "{n} รูป" },
  "gallery.close": { en: "Close", th: "ปิด" },
  "gallery.dropToAdd": {
    en: "Drop to add it to this post",
    th: "วางเพื่อเพิ่มรูปนี้เข้าโพสต์",
  },
  "gallery.addImages": { en: "Add pictures", th: "เพิ่มรูป" },
  "gallery.removeImage": { en: "Remove this picture", th: "ลบรูปนี้" },
  "gallery.imageOf": { en: "{n} of {total}", th: "รูปที่ {n} จาก {total}" },
  "gallery.prev": { en: "Previous picture", th: "รูปก่อนหน้า" },
  "gallery.next": { en: "Next picture", th: "รูปถัดไป" },
  "gallery.dropZone": {
    en: "Drag & drop to post a screenshot",
    th: "ลากรูปมาวางตรงนี้เพื่อโพสต์",
  },
  "gallery.browse": { en: "Browse files", th: "เลือกไฟล์" },
  "gallery.removeLast": {
    en: "That is the only picture left, so removing it deletes the post.",
    th: "เหลือรูปเดียวแล้ว ถ้าลบรูปนี้โพสต์จะถูกลบไปด้วย",
  },
  "gallery.nothingFound": {
    en: "Nothing matches that",
    th: "ไม่มีรูปที่ตรงกับที่ค้น",
  },

  // ── Home ────────────────────────────────────────────────────────────
  "home.freeCompany": { en: "Free Company", th: "Free Company" },
  "home.browseAll": { en: "Browse all {n} members", th: "ดูสมาชิกทั้งหมด {n} คน" },
  "home.members": { en: "Members", th: "สมาชิก" },
  "home.active": { en: "Active", th: "Active" },
  "bday.today": { en: "Today:", th: "วันนี้:" },
  "bday.soon": { en: "Coming up in the next {n} days", th: "ใน {n} วันข้างหน้า" },
  "bday.tomorrow": { en: "tomorrow", th: "พรุ่งนี้" },
  "bday.inDays": { en: "in {n} days", th: "อีก {n} วัน" },
  "bday.wish": { en: "go wish them well!", th: "ไปอวยพรกันหน่อย!" },
  "home.activity": { en: "FC activity", th: "ความเคลื่อนไหวใน FC" },
  "home.activityEmpty": {
    en: "Events start showing up after the next update run. The pipeline diffs the roster day over day, so new best parses, first boss clears and fresh mounts land here automatically.",
    th: "รายการจะเริ่มขึ้นหลังระบบดึงข้อมูลรอบถัดไป ระบบจะเทียบข้อมูลของแต่ละวัน แล้วเอา parse ใหม่ การเคลียร์บอสครั้งแรก และ mount ที่เพิ่งได้ มาขึ้นตรงนี้ให้เอง",
  },
  "home.timeline": { en: "Update timeline", th: "ไทม์ไลน์อัปเดต" },
  "home.timelineOfficial": { en: "Official", th: "ข่าวทางการ" },
  "home.timelineFc": { en: "FC", th: "ข่าว FC" },
  "home.postedByFc": { en: "Posted by the FC", th: "โพสต์โดย FC" },
  "home.announcements": { en: "FC announcements", th: "ประกาศจาก FC" },
  "home.birthdays": { en: "Birthdays today", th: "วันเกิดวันนี้" },

  // ── Member board ────────────────────────────────────────────────────
  "board.title": { en: "Members", th: "สมาชิก" },
  "board.verifiedHint": {
    en: "✦ = proved they own the character · click a name for the full profile",
    th: "✦ = ยืนยันแล้วว่าเป็นเจ้าของตัวละคร · กดที่ชื่อเพื่อดูโปรไฟล์เต็ม",
  },
  "board.search": { en: "Search name, nickname or race…", th: "ค้นหาชื่อ ชื่อเล่น หรือเผ่า…" },
  "board.sortName": { en: "Sort by name", th: "เรียงตามชื่อ" },
  "board.sortMounts": { en: "Sort by mounts", th: "เรียงตามจำนวน mount" },
  "board.sortRare": { en: "Sort by rare achv", th: "เรียงตาม achievement หายาก" },
  "board.clearAll": { en: "Clear all {n} filters", th: "ล้าง filter ทั้ง {n} อัน" },
  "board.who": { en: "Who", th: "ใคร" },
  "board.hasAllOf": { en: "Has all of", th: "มีครบทุกอันนี้" },
  "board.roleAny": { en: "Role: any", th: "Role: ทั้งหมด" },
  "board.jobAny": { en: "Job: any", th: "อาชีพ: ทั้งหมด" },
  "board.gradeAny": { en: "Grade: any", th: "ระดับ: ทั้งหมด" },
  "board.ultAny": { en: "Ultimate: any", th: "Ultimate: ทั้งหมด" },
  "board.raceAny": { en: "Race: any ({n})", th: "เผ่า: ทั้งหมด ({n})" },
  "board.rankAny": { en: "Rank: any", th: "ยศ: ทั้งหมด" },
  "board.lfgAny": { en: "Looking for: any", th: "กำลังหา: ทั้งหมด" },
  "board.anyHealer": { en: "Any healer", th: "Healer ทุกแบบ" },
  "board.anyDps": { en: "Any DPS", th: "DPS ทุกแบบ" },
  "board.anyTank": { en: "Any tank", th: "Tank ทุกแบบ" },
  "board.showing": { en: "Showing {shown} of {total} members", th: "แสดง {shown} จาก {total} คน" },
  "board.showingNone": {
    en: "Nothing selected — tick one of the three above.",
    th: "ยังไม่ได้เลือก — ติ๊กอย่างน้อยหนึ่งอันด้านบน",
  },
  "board.showEveryone": { en: "show everyone", th: "แสดงทุกคน" },
  "board.nobody": { en: "Nobody matches that", th: "ไม่มีใครตรงกับที่ค้นหา" },
  "board.activeAll": { en: "Everyone", th: "ทุกคน" },
  "board.activeActive": { en: "Active", th: "Active" },
  "board.activeVacation": { en: "On vacation", th: "พักอยู่" },
  "board.tagsMean": { en: "What do the tags mean?", th: "แต่ละ tag หมายความว่าอะไร?" },

  // ── Member page ─────────────────────────────────────────────────────
  "member.back": { en: "Back to members", th: "กลับไปหน้าสมาชิก" },
  "member.currentPatch": { en: "Current patch", th: "Patch ปัจจุบัน" },
  "member.extremeTrials": { en: "Extreme trials", th: "Extreme trials" },
  "member.clearedCount": { en: "({done} of {total} cleared)", th: "(เคลียร์แล้ว {done} จาก {total})" },
  "member.cleared": { en: "Cleared", th: "เคลียร์แล้ว" },
  "new.label": { en: "New player", th: "ผู้เล่นใหม่" },
  "new.why": {
    en: "One of the smallest collections in the company — mounts and minions both.",
    th: "คอลเลกชันน้อยที่สุดใน FC ทั้ง mount และ minion",
  },
  "new.msq": { en: "MSQ Progressing:", th: "MSQ Progressing:" },
  "new.playingMsq": {
    en: "Playing the {patch} story",
    th: "กำลังเล่นเนื้อเรื่อง {patch}",
  },
  "new.doneMsq": {
    en: "Finished the story up to {patch}",
    th: "จบเนื้อเรื่องถึง {patch} แล้ว",
  },
  "member.progressing": { en: "Progressing:", th: "กำลังเล่น:" },
  "member.justCleared": { en: "Just cleared:", th: "เพิ่งผ่าน:" },
  "member.inProgress": { en: "Raiding lately", th: "ช่วงนี้กำลังเล่น" },
  "member.noLogYet": { en: "No log yet", th: "ยังไม่มี log" },
  "member.awaitingData": { en: "Awaiting data", th: "รอข้อมูล" },
  "member.kills": { en: "{n} kills", th: "ฆ่า {n} ครั้ง" },
  "member.collection": { en: "Collection", th: "ของสะสม" },
  "member.mounts": { en: "Mounts", th: "Mounts" },
  "member.minions": { en: "Minions", th: "Minions" },
  "member.rareAchv": { en: "Rare achv", th: "Achievement หายาก" },
  "member.higherThan": { en: "Higher than {n}% of the FC", th: "สูงกว่า {n}% ของ FC" },
  "member.ultimates": { en: "Ultimates", th: "Ultimates" },
  "member.jobs": { en: "Jobs", th: "อาชีพ" },
  "member.notLinked": {
    en: "Not linked to FF Logs yet — raid data appears automatically once the API keys are set and the pipeline runs",
    th: "ยังไม่ได้เชื่อมกับ FF Logs — ข้อมูล raid จะขึ้นเองเมื่อระบบดึงข้อมูลรอบถัดไป",
  },
  "member.rarest": { en: "Rarest achievements", th: "Achievement ที่หายากที่สุด" },
  "member.showAll": { en: "Show all {n}", th: "แสดงทั้งหมด {n} อัน" },
  "member.showFewer": { en: "Show fewer", th: "แสดงน้อยลง" },

  // ── Profile ─────────────────────────────────────────────────────────
  "profile.title": { en: "My profile", th: "โปรไฟล์ของคุณ" },
  "profile.waysToSignIn": { en: "Ways to sign in", th: "ช่องทางเข้าสู่ระบบ" },
  "profile.waysHint": {
    en: "Link a second one and either will get you back to this same profile. Worth doing before you need it.",
    th: "ผูกช่องทางที่สองไว้ แล้วจะเข้าด้วยทางไหนก็ได้ กลับมาที่โปรไฟล์เดียวกัน ควรทำไว้ก่อนที่จะต้องใช้",
  },
  "profile.link": { en: "Link {name}", th: "ผูก {name}" },
  "profile.myCharacter": { en: "My character", th: "ตัวละครของคุณ" },
  "profile.viewMyPage": { en: "View my page", th: "ดูหน้าของคุณ" },
  "profile.unlink": { en: "Unlink", th: "ยกเลิกการผูก" },
  "profile.customise": { en: "Customise profile", th: "ปรับแต่งโปรไฟล์" },
  "profile.nickname": { en: "Nickname", th: "ชื่อเล่น" },
  "profile.birthday": { en: "Birthday (day and month only)", th: "วันเกิด (เอาแค่วันกับเดือน)" },
  "profile.clear": { en: "clear", th: "ล้าง" },
  "profile.bio": { en: "About me", th: "เกี่ยวกับคุณ" },
  "profile.accent": { en: "Accent colour", th: "สีประจำตัว" },
  "profile.banner": { en: "Profile banner", th: "แบนเนอร์โปรไฟล์" },
  "profile.lookingFor": { en: "Looking for", th: "กำลังมองหา" },
  "profile.availability": { en: "When I usually play", th: "ช่วงที่ปกติว่างเล่น" },
  "profile.availabilityHint": {
    en: "Drag down a day to paint the hours you are usually around for — press on the first hour and pull to the last. Dragging back over what you painted clears it. Tap a day name for the whole day, or an hour for that hour all week. Thai time.",
    th: "ลากลงในคอลัมน์ของวันนั้นเพื่อระบายชั่วโมงที่ปกติว่าง กดค้างที่ชั่วโมงแรกแล้วลากถึงชั่วโมงสุดท้าย ลากย้อนกลับทับที่ระบายไว้คือลบ กดที่ชื่อวันเลือกทั้งวัน กดที่ตัวเลขชั่วโมงเลือกชั่วโมงนั้นทั้งสัปดาห์ เป็นเวลาไทย",
  },
  "profile.availabilityClear": { en: "Clear all", th: "ล้างทั้งหมด" },
  "member.availability": { en: "Usually around", th: "ปกติว่างช่วงนี้" },
  "member.availabilityNote": { en: "Thai time", th: "เวลาไทย" },
  "profile.save": { en: "Save", th: "บันทึก" },
  "profile.saving": { en: "Saving…", th: "กำลังบันทึก…" },
  "profile.saved": {
    en: "Saved — your profile and the board update immediately",
    th: "บันทึกแล้ว — โปรไฟล์กับหน้าสมาชิกอัปเดตทันที",
  },
  "profile.language": { en: "Site language", th: "ภาษาของเว็บไซต์" },
  "profile.languageHint": {
    en: "Which language the site opens in for you. You can still switch it any time from the header, and sections with their own toggle keep working as before.",
    th: "ภาษาที่เว็บจะเปิดให้คุณเป็นค่าเริ่มต้น สลับเองได้ตลอดเวลาจากแถบด้านบน และส่วนที่มีปุ่มสลับภาษาของตัวเองก็ยังใช้ได้เหมือนเดิม",
  },
  "profile.guestName": { en: "What should we call you?", th: "อยากให้เรียกคุณว่าอะไร" },
  "profile.guestNameHint": {
    en: "Shown wherever you sign up for something. You can change it whenever.",
    th: "ใช้แสดงตอนคุณลงชื่อร่วมกิจกรรม เปลี่ยนได้ตลอด",
  },
  "profile.signInPrompt": {
    en: "Sign in to verify your character and customise your profile. Coming to an event without being in the FC works too — you do not need a character at all.",
    th: "เข้าสู่ระบบเพื่อยืนยันตัวละครและปรับแต่งโปรไฟล์ ถ้ามาร่วมกิจกรรมโดยไม่ได้อยู่ใน FC ก็เข้าได้ ไม่จำเป็นต้องมีตัวละคร",
  },
  "profile.fcMember": { en: "FC member", th: "สมาชิก FC" },
  "profile.guest": { en: "Guest", th: "ผู้มาเยือน" },
  "profile.guestNoChar": { en: "Guest — no character linked", th: "ผู้มาเยือน — ยังไม่ได้ผูกตัวละคร" },
  "profile.verified": { en: "verified", th: "ยืนยันแล้ว" },
  "profile.notVerified": { en: "not verified yet", th: "ยังไม่ได้ยืนยัน" },

  // ── Leaderboards ────────────────────────────────────────────────────
  "lb.title": { en: "Leaderboards", th: "Leaderboards" },
  "lb.empty": {
    en: "Nothing to rank yet. Scores appear once the pipeline has read achievements from FFXIV Collect for members who keep them public.",
    th: "ยังไม่มีข้อมูลให้จัดอันดับ คะแนนจะขึ้นเมื่อระบบอ่าน achievement จาก FFXIV Collect ของคนที่เปิดเป็นสาธารณะได้แล้ว",
  },
  "lb.onVacation": { en: "on vacation", th: "พักอยู่" },

  // ── Shared ──────────────────────────────────────────────────────────
  "common.loading": { en: "Loading…", th: "กำลังโหลด…" },
  "drop.title": {
    en: "Drag & drop a picture here",
    th: "ลากรูปมาวางตรงนี้",
  },
  "drop.now": { en: "Drop it here", th: "วางตรงนี้เลย" },
  "drop.browse": { en: "Browse files", th: "เลือกไฟล์" },
  "drop.paste": {
    en: "Ctrl+V pastes one",
    th: "กด Ctrl+V วางรูปที่ copy ไว้ก็ได้",
  },
  "common.or": { en: "or", th: "หรือ" },
  "common.cancel": { en: "Cancel", th: "ยกเลิก" },
  "common.delete": { en: "Delete", th: "ลบ" },
  /*
   * ── The party finder ────────────────────────────────────────────────
   *
   * The chrome, and nothing else. What a party is for stays in English
   * because it is what the FC says out loud: M12S, Savage, Extreme, FATE,
   * Bozja, A2C, Farm, L to R, FFA, Tank, Healer, DPS. A Thai rendering of
   * "Fresh start" or "Book run" would be a word nobody uses, on a board
   * whose whole job is that two people reading it understand the same
   * thing.
   *
   * Translated here: every question the page asks and every button it
   * offers. Those are the site talking, not the game.
   */
  "party.title": { en: "Party finder", th: "หาปาร์ตี้" },
  "party.times": {
    en: "All times are Thai time (UTC+7).",
    th: "เวลาทั้งหมดเป็นเวลาไทย (UTC+7)",
  },
  /* No plus: the icon beside it is the Duty Finder's own hexagon, which says
     "a duty is being arranged" rather than "something is being added". */
  "party.new": { en: "New party", th: "ตั้งปาร์ตี้" },
  "party.search": {
    en: "Search a fight, a note, or somebody already in",
    th: "ค้นหาไฟต์ ข้อความ หรือชื่อคนที่อยู่ในปาร์ตี้",
  },
  "party.sortSoon": { en: "Starting soonest", th: "ใกล้เริ่มที่สุด" },
  "party.sortNew": { en: "Just posted", th: "เพิ่งตั้ง" },
  "party.sortOpen": { en: "Most seats open", th: "ที่ว่างเยอะที่สุด" },
  "party.clearN": { en: "Clear {n}", th: "ล้าง {n}" },
  "party.needs": { en: "Needs", th: "ขาด" },
  "party.anyRole": { en: "Any role", th: "ตำแหน่งไหนก็ได้" },
  "party.wantsRole": { en: "Wants a {role}", th: "ขาด {role}" },
  "party.progress": { en: "Progress", th: "ความคืบหน้า" },
  "party.anyProgress": { en: "Any progress", th: "ทุกความคืบหน้า" },
  "party.loot": { en: "Loot", th: "แผน Loot" },
  "party.anyLoot": { en: "Any loot rule", th: "ทุกแผน Loot" },
  "party.when": { en: "When", th: "เมื่อไหร่" },
  "party.anyTime": { en: "Any time", th: "ทุกเวลา" },
  "party.within1": { en: "Within a day", th: "ภายใน 1 วัน" },
  "party.within3": { en: "Within three days", th: "ภายใน 3 วัน" },
  "party.within7": { en: "Within a week", th: "ภายใน 1 สัปดาห์" },
  "party.hasRoom": { en: "Still has room", th: "ยังมีที่ว่าง" },
  /* The grid on the profile, pointed at the board: which of these start while
     I am usually around. */
  /* Its own area at the top. A party you are in is not one listing among
     forty — it is the thing you came to check. */
  "party.kindLegacy": { en: "Older raids & trials", th: "Raid/Trial เก่า" },
  "party.kindMentor": { en: "Find Mentor", th: "หา Mentor" },
  "party.mineHeading": {
    en: "Parties you are in ({n})", th: "ปาร์ตี้ที่มีคุณอยู่ ({n})",
  },
  // Above the one above it. An invitation is the only row on the board that
  // cannot move without the reader, and it used to sit inside "parties you are
  // in" — telling them they had accepted something they had not.
  "party.invitedHeading": {
    en: "Waiting on your answer ({n})", th: "รอคุณตอบรับ ({n})",
  },
  "party.askedHeading": {
    en: "Waiting on the lead ({n})", th: "รอผู้สร้าง Party ตอบรับ ({n})",
  },
  "party.whenIPlay": { en: "When I play", th: "ตรงกับเวลาที่คุณเล่น" },
  "party.setHours": {
    en: "Set the hours you usually play on your profile first.",
    th: "ตั้งช่วงเวลาที่ปกติว่างเล่นในโปรไฟล์ก่อน",
  },
  "party.setHoursShort": { en: "set them", th: "ตั้งเลย" },
  "party.countOne": { en: "1 party", th: "1 ปาร์ตี้" },
  "party.countMany": { en: "{n} parties", th: "{n} ปาร์ตี้" },
  "party.loading": { en: "Loading…", th: "กำลังโหลด…" },
  "party.none": {
    en: "Nothing matches. Try clearing a filter, or put one up yourself.",
    th: "ไม่มีปาร์ตี้ที่ตรงกับที่เลือก ลองล้างตัวกรอง หรือตั้งปาร์ตี้เองก็ได้",
  },
  "party.onePerJob": { en: "one player per job", th: "หนึ่งคน/อาชีพ" },

  /* ── The five states, which are the five things a reader wants ────── */
  "party.status": { en: "Status", th: "สถานะ" },
  "party.stUpcoming": { en: "Not started", th: "ยังไม่เริ่ม" },
  "party.stSoon": { en: "Starting soon", th: "กำลังจะเริ่ม" },
  "party.stLive": { en: "In progress", th: "เริ่มแล้ว" },
  "party.stJustEnded": { en: "Just ended", th: "เพิ่งจบไป" },
  "party.stDone": { en: "Ended", th: "จบแล้ว" },
  "party.stOpenOnly": { en: "Not ended yet", th: "ที่ยังไม่จบ" },

  /*
   * The countdown.
   *
   * Two lines rather than one with a unit appended, because Thai puts the
   * unit after the number with a space and English does not, and a clock
   * assembled out of fragments by whichever component needed one is a clock
   * that reads wrong in one of the two languages.
   */
  "party.leftDH": { en: "{d}d {h}h", th: "{d} วัน {h} ชม." },
  "party.leftHM": { en: "{h}h {m}m", th: "{h} ชม. {m} นาที" },
  "party.leftMS": { en: "{m}m {s}s", th: "{m}:{s} นาที" },
  /* Under a minute the mm:ss form reads as "0:37 minutes", which is not what
     thirty-seven seconds is called in either language. */
  "party.leftS": { en: "{s}s", th: "{s} วินาที" },
  /* The whole phrase, because "ago" is a word at the end in English and no
     word at all in Thai — a sentence built from a prefix and a clock reads
     wrong in one of the two however the fragments are arranged. */
  "party.startsIn": { en: "starts in {left}", th: "อีก {left}" },
  "party.endsIn": { en: "ends in {left}", th: "จบในอีก {left}" },
  "party.endedAgo": { en: "ended {left} ago", th: "จบไปแล้ว {left}" },

  /* ── Joining, and being let in ────────────────────────────────────── */
  "party.askToJoin": { en: "Ask to join", th: "ขอเข้าร่วม" },
  // The lead is not asking anybody. Nothing is pending after this and there is
  // nobody to approve it, so a button saying "ask" would be describing a wait
  // that does not happen.
  "party.takeOwnSeat": { en: "Take your seat", th: "ลงตำแหน่งของคุณ" },
  // Said differently once you are already sitting somewhere: the same buttons,
  // but the question is where you are going rather than whether you are in.
  "party.moveSeat": { en: "Move to", th: "ย้ายไปที่" },
  "party.asking": { en: "Asking…", th: "กำลังส่ง…" },
  "party.asked": {
    en: "Waiting for the lead to let you in",
    th: "รอผู้สร้าง Party ยืนยัน",
  },
  /* And which seat, because the grid no longer says.
     A request is not drawn in the party until it is answered — that is the
     point of it — so this line is the only place the seat somebody asked for
     is written down, and "waiting" on its own left them unable to check what
     they had actually sent. */
  "party.askedFor": {
    en: "Waiting for the lead to let you into {seat}",
    th: "รอผู้สร้าง Party ยืนยัน — ขอที่นั่ง {seat}",
  },
  "party.withdraw": { en: "Withdraw", th: "ยกเลิกคำขอ" },
  "party.invited": { en: "You have been invited", th: "คุณถูกชวนเข้าปาร์ตี้นี้" },
  /* ── An invitation names a seat and does not hold it ─────────────────
     Three people can be asked about D4 at once, so the answer has to say
     which of them got it and what the others are agreeing to instead. */
  "party.invitedTo": {
    en: "You have been asked about {seat}",
    th: "คุณถูกชวนมาลงตำแหน่ง {seat}",
  },
  "party.seatGone": {
    en: "{seat} has been taken since — you would come in without a seat and pick one later.",
    th: "ตอนนี้ {seat} มีคนลงแล้ว ถ้าตอบตกลงจะเข้ามาแบบยังไม่มีตำแหน่ง แล้วค่อยเลือกทีหลังได้",
  },
  "party.acceptSeat": { en: "Accept {seat}", th: "ตกลง ลง {seat}" },
  "party.acceptAnyway": { en: "Come anyway", th: "ตกลง เข้าร่วมเลย" },
  "party.youAreInAt": {
    en: "You are in, on {seat}", th: "คุณอยู่ในปาร์ตี้นี้แล้ว ตำแหน่ง {seat}",
  },
  "party.takeASeat": { en: "Take a seat", th: "เลือกตำแหน่ง" },
  "party.accept": { en: "Accept", th: "ตอบรับ" },
  "party.youAreIn": { en: "You are in this party", th: "คุณอยู่ในปาร์ตี้นี้แล้ว" },
  "party.leave": { en: "Leave", th: "ออกจากปาร์ตี้" },
  /* Not a refusal so much as a fact: an hour out, the rest of the party has
     counted you in, and a seat given up at ten to eight cannot be filled. */
  "party.tooLateToLeave": {
    en: "Too close to the start to drop out",
    th: "ใกล้เวลาเริ่มแล้ว ออกจากปาร์ตี้ไม่ได้",
  },
  "party.letIn": { en: "Let in", th: "รับเข้า" },
  "party.turnDown": { en: "Turn down", th: "ปฏิเสธ" },
  "party.waitingOnYou": { en: "{n} waiting for you", th: "มี {n} คนรอคุณยืนยัน" },
  "party.pickSeats": {
    en: "Which seats can you play?", th: "เล่นตำแหน่งไหนได้บ้าง",
  },
  "party.pickSeatsFirst": {
    en: "Pick a seat, or say you can play anything.",
    th: "เลือกตำแหน่งที่เล่นได้ หรือกดว่าเล่นได้ทุกตำแหน่ง",
  },
  "party.flexAny": { en: "I can play anything", th: "เล่นได้ทุกตำแหน่ง" },
  "party.pickJob": { en: "Which job", th: "อาชีพที่จะเล่น" },
  "party.pickJobFirst": {
    en: "Say which job you will be on.",
    th: "เลือกอาชีพที่จะเล่นด้วย",
  },
  "party.askingFor": {
    en: "Asking for whichever is left of: {seats}",
    th: "ขอเข้าตำแหน่งที่เหลือจาก: {seats}",
  },
  "party.anySeat": { en: "Anywhere you need me", th: "ตรงไหนก็ได้" },

  /* ── A link to one party ──────────────────────────────────────────── */
  "party.lootOwner": { en: "Map owner takes all", th: "เจ้าของแมพได้ของทั้งหมด" },
  "party.copyLink": { en: "Copy link", th: "คัดลอกลิงก์" },
  "party.copied": { en: "Link copied", th: "คัดลอกแล้ว" },

  /* ── A map night ──────────────────────────────────────────────────── */
  /* ── A roulette night ─────────────────────────────────────────────── */
  "pf.whichRoulettes": { en: "Which roulettes", th: "ลง Roulette ไหนบ้าง" },
  "pf.roulettesReset": {
    en: "Roulettes reset daily at {at} Thai time",
    th: "Roulette รีเซ็ตทุกวัน {at} น. เวลาไทย",
  },

  "party.mapWhich": { en: "Which map", th: "แมพไหน" },
  "party.mapAny": { en: "Any map", th: "แมพไหนก็ได้" },
  "party.mapLatest": { en: "latest", th: "ล่าสุด" },
  "party.mapEach": { en: "Maps each", th: "คนละกี่แมพ" },
  "party.mapEachAny": { en: "However many", th: "กี่แมพก็ได้" },
  "party.mapEachN": { en: "{n} each", th: "คนละ {n} แมพ" },
  "party.estimate": { en: "estimate", th: "โดยประมาณ" },
  "party.estimateWhy": {
    en: "A rough figure — a map night runs until the maps are done, and how long that takes is a dice roll.",
    th: "เป็นเวลาโดยประมาณ เพราะ Treasure hunt จบเมื่อเปิดแมพครบ ซึ่งใช้เวลาไม่แน่นอน",
  },

  /* ── What the mercenary is paying for ─────────────────────────────── */
  "party.payWhen": { en: "Paid when", th: "จ่ายเมื่อ" },
  "party.payClear": { en: "On the clear", th: "เมื่อผ่านไฟต์" },
  "party.payMount": { en: "On a rare mount", th: "เมื่อได้ rare mount" },
  "party.payBoth": { en: "Either", th: "อย่างใดอย่างหนึ่ง" },
  "party.payClearWhy": {
    en: "Paid when the boss dies, whatever dropped.",
    th: "จ่ายเมื่อผ่านบอส ไม่ว่าจะดรอปอะไร",
  },
  "party.payMountWhy": {
    en: "Paid only if the rare mount drops. Some nights that is nobody.",
    th: "จ่ายเฉพาะตอนที่ rare mount ดรอป",
  },
  "party.payBothWhy": {
    en: "Paid for the clear, and again if the mount drops.",
    th: "จ่ายเมื่อผ่านไฟต์ และจ่ายอีกครั้งถ้า mount ดรอป",
  },

  /*
   * ── Putting a party up ──────────────────────────────────────────────
   *
   * The form, which is where the site does most of its talking: what each
   * control is for, what a rule will do, and what happens after you press
   * the button. A Thai member filling this in should not have to read
   * English to find out that placing somebody is an invitation rather than
   * a booking.
   *
   * The game's own vocabulary is still left alone. Tank, Healer, DPS, the
   * job names, the fight names, and the four rungs of the progress track
   * are what the FC says out loud either way.
   */
  "pf.new": { en: "New party", th: "ตั้งปาร์ตี้ใหม่" },
  "pf.edit": { en: "Edit", th: "แก้ไข" },
  /* Said on a content card and on the size control, both of which are refused
     for the same reason: the people already in this party would not fit. */
  "pf.wontFit": {
    en: "Too small for who is already in",
    th: "คนในปาร์ตี้ตอนนี้ไม่พอดีกับขนาดนี้",
  },
  "pf.sizeLocked": {
    en: "The size cannot change with people in the party — put up a new one instead.",
    th: "เปลี่ยนขนาดปาร์ตี้ไม่ได้เมื่อมีคนอยู่แล้ว ถ้าต้องการขนาดอื่นให้ตั้งปาร์ตี้ใหม่",
  },
  "pf.editing": { en: "Edit party", th: "แก้ไขปาร์ตี้" },
  "pf.saveEdit": { en: "Save changes", th: "บันทึกการแก้ไข" },
  "pf.saveAsk": {
    en: "Save these changes? Everybody who is in the party will see them.",
    th: "บันทึกการแก้ไขนี้ไหม ทุกคนในปาร์ตี้จะเห็นตามที่แก้",
  },
  "pf.deleteParty": { en: "Delete party", th: "ลบปาร์ตี้" },
  "pf.deleteAsk": {
    en: "Delete this party? It comes off the board for everybody, along with what was said in it.",
    th: "ลบปาร์ตี้นี้ไหม ปาร์ตี้จะหายไปจากบอร์ดของทุกคน พร้อมกับข้อความที่คุยกันไว้",
  },
  "pf.editedAt": { en: "edited {at}", th: "แก้ไขล่าสุด {at}" },
  "pf.pickContent": { en: "What are we running?", th: "จะเล่นอะไร" },
  "pf.cancel": { en: "Cancel", th: "ยกเลิก" },
  "pf.close": { en: "close", th: "ปิด" },
  "pf.whoIsIn": { en: "Who is in {seat}?", th: "ใครลง {seat}" },
  "pf.done": { en: "Done", th: "เสร็จ" },
  "pf.change": { en: "change", th: "เปลี่ยน" },
  "pf.choose": { en: "choose", th: "เลือก" },
  "pf.remove": { en: "Remove", th: "เอาออก" },
  "pf.changeLower": { en: "change", th: "แก้ไข" },
  "pf.removeLower": { en: "remove", th: "เอาออก" },
  "pf.outsider": { en: "outside the FC", th: "คนนอก FC" },
  "pf.noPositionsYet": { en: "no positions yet", th: "ยังไม่ได้เลือกตำแหน่ง" },
  /* Just what the field is. The examples it used to give — which map, which
     phase, voice or not — are three answers to a question the rest of the form
     already asks properly, and the one thing this field is for is the line
     people read on the board. */
  "pf.note": {
    en: "Headline for this party",
    th: "หัวข้อของปาร์ตี้",
  },
  "pf.starts": { en: "Starts (Thai time)", th: "เริ่ม (เวลาไทย)" },
  /* For a screen reader. The two lists sit either side of a colon and are
     obvious to look at; neither has room for a label of its own. */
  "pf.hour": { en: "Hour", th: "ชั่วโมง" },
  "pf.minute": { en: "Minute", th: "นาที" },
  "pf.timeOfDay": { en: "Time", th: "เวลา" },
  "pf.pickDay": { en: "Pick a day", th: "เลือกวัน" },
  /* "ยาว" is how long a thing is, not how long it lasts — it reads as a
     measurement of the party rather than of the evening. */
  "pf.for": { en: "Length (approx.)", th: "ระยะเวลา (โดยประมาณ)" },
  "pf.runs": { en: "runs", th: "รอบ" },
  "pf.nRuns": { en: "{n} runs", th: "{n} รอบ" },
  /* The FC's own unit, kept as the word they say rather than translated into
     plates of something. */
  "pf.nFood": { en: "{n} Foods", th: "{n} Foods" },
  "pf.untilMapsDone": {
    en: "until everybody's maps are done",
    th: "จนกว่าทุกคนจะเปิดแมพครบ",
  },
  "pf.runsWhy": {
    en: "as many as it takes — no end time",
    th: "จนกว่าจะครบรอบ ไม่กำหนดเวลาจบ",
  },
  "pf.size": { en: "Party size", th: "ขนาดปาร์ตี้" },
  "pf.unit": { en: "Unit", th: "หน่วย" },
  "pf.hours": { en: "hours", th: "ชั่วโมง" },
  "pf.setByContent": { en: "set by the content", th: "กำหนดตามคอนเทนต์" },

  /* The three arrangements, and the three reasons there is no arrangement. */
  /*
   * The number, without the word.
   *
   * "Full party (8)" is the game's name for the arrangement and it collides
   * with the other thing this board says about a party — that it is full, as
   * in there is no room. In Thai the collision is total: ปาร์ตี้เต็ม is what
   * you would write for both, and a row saying ปาร์ตี้เต็ม (8) beside a marker
   * saying เต็มแล้ว is two different facts in one word. The seat count says
   * everything the name was carrying and cannot be misread.
   */
  "pf.shapeLight": { en: "4 players", th: "4 คน" },
  "pf.shapeFull": { en: "8 players", th: "8 คน" },
  // Who is in it, not how big it is. See headSay.
  "pf.headcount": { en: "{n}/{of} players", th: "{n}/{of} คน" },
  "pf.anyJobShort": { en: "any job", th: "อาชีพไหนก็ได้" },
  "pf.shapeFour": { en: "4 players · any job", th: "4 คน · อาชีพไหนก็ได้" },
  "pf.shapeEight": { en: "8 players · any job", th: "8 คน · อาชีพไหนก็ได้" },
  "pf.shapeAlliance": { en: "Alliance · 24", th: "Alliance · 24 คน" },
  "pf.openPvp": { en: "Everyone queues separately", th: "ทุกคน queue แยกกัน" },
  "pf.openCommunity": { en: "Anyone can join", th: "ใครมาก็ได้" },
  "pf.openNone": { en: "No fixed party", th: "ไม่จำกัดปาร์ตี้" },
  /* The same three, said as a sentence rather than a chip: the shape row has
     room for two words and the empty seat panel has room for a line. */
  "pf.openCommunityWhy": {
    en: "No party — whoever turns up is part of it.",
    th: "ไม่มีการจัดปาร์ตี้ ใครมาก็ร่วมได้เลย",
  },
  "pf.openPvpWhy": {
    en: "No party is formed — everybody queues on their own.",
    th: "ไม่มีการจัดปาร์ตี้ ทุกคน queue เอง",
  },
  "pf.openTurnUp": {
    en: "No fixed party — turn up and join in.",
    th: "ไม่มีการจัดปาร์ตี้ มาถึงแล้วเข้าร่วมได้เลย",
  },

  /* Where we are: the rung names stay, what each one asks for does not. */
  "pf.whereWeAre": { en: "Where we are", th: "ถึงไหนแล้ว" },
  "pf.progFreshWhy": {
    en: "Nobody has seen it. Everything gets explained.",
    th: "ยังไม่มีใครเคยเล่น อธิบายกันทุกท่า",
  },
  "pf.progProgWhy": {
    en: "Working through the fight. Say what we are drilling.",
    th: "กำลังไล่ไฟต์อยู่ บอกด้วยว่าฝึกท่าไหน",
  },
  "pf.progA2cWhy": {
    en: "The whole fight is known — going for the clear.",
    th: "รู้ไฟต์หมดแล้ว ลงไปเอาผ่าน",
  },
  "pf.progFarmWhy": {
    en: "It dies. This is for the loot.",
    th: "ผ่านอยู่แล้ว ลงมาฟาร์มของ",
  },
  "pf.mechProg": {
    en: "What are we drilling? e.g. second Wroth Flames, adds into cleaves",
    th: "ฝึกท่าไหนอยู่ เช่น Wroth Flames ครั้งที่สอง, adds ต่อ cleaves",
  },
  "pf.mechA2c": {
    en: "Anything still catching people out? (optional)",
    th: "ยังมีท่าไหนที่คนพลาดบ่อยไหม (ไม่ใส่ก็ได้)",
  },
  /* ── The in-game party finder helper ──────────────────────────────── */
  "pf.helper": { en: "In-game PF helper", th: "ตัวช่วยตั้งห้อง PF ในเกม" },
  "pf.betaTag": { en: "beta", th: "ทดลอง" },
  "pf.beta": {
    en: "Still being tested. Read it before you post, and tell us what the "
      + "board says back — the wording is copied from real listings, not "
      + "translated, so it is right about the party and not yet proven to "
      + "read well.",
    th: "ฟีเจอร์นี้อยู่ในช่วงทดลอง อ่านทวนก่อนโพสต์ทุกครั้ง — ข้อความถอดมาจาก"
      + "ห้องจริงของคนญี่ปุ่น ไม่ได้แปลด้วยเครื่อง ข้อมูลถูกแน่นอนแต่ยังไม่ได้"
      + "พิสูจน์ว่าอ่านแล้วลื่นไหม เจออะไรแปลกบอกได้เลย",
  },
  "pf.helperTitle": {
    en: "In-game PF helper", th: "ตัวช่วยสร้าง PF ในเกมส์",
  },
  "pf.inGameSettings": {
    en: "Pick these in the game — no typing", th: "เลือกในเกม ไม่ต้องพิมพ์",
  },
  "pf.openSlots": { en: "Open these slots", th: "เปิดช่องเหล่านี้" },
  "pf.pfComment": { en: "Comment", th: "ข้อความ" },
  "pf.copyComment": { en: "Copy", th: "คัดลอก" },
  "pf.tooLong": {
    en: "Too long — the game will cut it off.",
    th: "ยาวเกิน เกมจะตัดทิ้ง",
  },
  "pf.extras": { en: "Add to it", th: "เพิ่มเติม" },
  "pf.xTime": { en: "The hours (JST)", th: "เวลา (เวลาญี่ปุ่น)" },
  "pf.xSeats": { en: "Which seats we want", th: "ตำแหน่งที่ต้องการ" },
  "pf.xNotFluent": {
    en: "Say our Japanese is weak", th: "บอกว่าญี่ปุ่นเราไม่เก่ง",
  },
  "pf.xPlan": { en: "Strat used ({what})", th: "Strat ที่ใช้ ({what})" },
  "pf.xMacroYes": { en: "Macros and markers set", th: "มี macro + marker" },
  "pf.xMacroNo": { en: "No macros", th: "ไม่มี macro" },
  "pf.xRunsRc": {
    en: "Ready check between runs", th: "Ready check ระหว่างรอบ",
  },
  "pf.xReadyCheck": {
    en: "Ready check before the pull", th: "Ready check ก่อนเริ่ม",
  },
  "pf.xFirstTimers": { en: "First-timers welcome", th: "รับมือใหม่" },
  "pf.xNoHomework": {
    en: "No homework needed", th: "ไม่ต้องดู Boss Mechanics มาก่อน",
  },
  "pf.xGiveUp": { en: "Disband on give-up", th: "เลิกเมื่อยอมแพ้" },
  "pf.xCasual": { en: "Casuals welcome", th: "เข้ามาได้สบายๆ" },
  "pf.xWipes": { en: "Disband after N wipes", th: "เลิกเมื่อตาย N ครั้ง" },
  "pf.helperWhy": {
    en: "Built from the listing, never translated — edit it before you post.",
    th: "ประกอบจากข้อมูลห้อง ไม่ได้แปลอัตโนมัติ แก้ได้ก่อนเอาไปโพสต์",
  },

  // The example is the answer nine listings in ten give, so it is the whole
  // hint. A list of alternatives reads as a menu to choose from and this is a
  // box to type a name into.
  "pf.phaseWhy": {
    en: "Which part of the fight tonight is about. It leads the listing and "
      + "the in-game PF text — P3 Prog is \"we are drilling phase 3\", P3 A2C "
      + "is \"we start at 3 and take it to the end\".",
    th: "บอกว่าคืนนี้อยู่ตรงไหนของไฟต์ จะขึ้นนำหน้าทั้งบนบอร์ดและในข้อความ PF "
      + "ในเกม — P3 Prog คือ \"ซ้อมเฟส 3\" ส่วน P3 A2C คือ \"เริ่มที่เฟส 3 "
      + "แล้วตีให้จบ\"",
  },
  "pf.planHint": { en: "Strat used — game8", th: "Strat ที่ใช้ — game8" },
  "pf.readsAs": { en: "Reads as:", th: "จะขึ้นว่า:" },

  /* Loot: the handles stay, the explanations do not. */
  "pf.lootLtrWhy": {
    en: "Left to right down the party list — whoever gets theirs leaves.",
    th: "ไล่จากซ้ายไปขวาตามลิสต์ปาร์ตี้ ใครได้ของแล้วออก",
  },
  "pf.lootFfaWhy": {
    en: "Free for all. Everybody rolls on everything.",
    th: "Roll กันทุกคน ทุกชิ้น",
  },
  "pf.lootMercWhy": {
    en: "The lead pays everyone for a clear or a rare drop, and keeps the loot.",
    th: "ผู้สร้าง Party จ่ายเงินให้ทุกคนตามเงื่อนไข",
  },
  "pf.lootBookWhy": {
    en: "Here for the weekly books. Nobody is fighting over the gear.",
    th: "มาเก็บ book รายสัปดาห์ ไม่ต้องการของ",
  },
  "pf.lootOwnerWhy": {
    en: "Whoever opened the map keeps what came out of it. The rest are helping.",
    th: "ใครเปิดแมพ คนนั้นได้ของทั้งหมด ที่เหลือมาช่วย",
  },
  "pf.payEach": { en: "Paying each person", th: "จ่ายคนละ" },

  /* Where in the game. */
  "pf.mapClick": {
    en: "Click the map to place it",
    th: "กดบนแผนที่เพื่อปักหมุด",
  },
  "pf.mapFrom": { en: "map from XIVAPI", th: "แผนที่จาก XIVAPI" },
  "pf.ward": { en: "Ward", th: "Ward" },
  "pf.plot": { en: "Plot", th: "Plot" },
  "pf.where": { en: "Meeting point", th: "จุดนัดพบ" },
  "pf.whereHelp": {
    en: "Any zone in the game. Coordinates optional.",
    th: "แมพไหนในเกมก็ได้ พิกัดใส่หรือไม่ใส่ก็ได้",
  },
  "pf.whereSearch": {
    en: "Search a zone — Kozama'uka, Limsa, Crystarium…",
    th: "ค้นหาแมพ — Kozama'uka, Limsa, Crystarium…",
  },
  "pf.whereNone": {
    en: "No zone by that name. {n} places are listed — try a shorter search.",
    th: "ไม่มีแมพชื่อนี้ มีทั้งหมด {n} ที่ ลองพิมพ์สั้นลง",
  },

  /* The write-up. */
  "pf.plan": {
    en: "Party details",
    th: "รายละเอียด Party",
  },
  "pf.paragraph": { en: "+ Paragraph", th: "+ ข้อความ" },
  "pf.dropAnywhere": {
    en: "or drop pictures anywhere in here",
    th: "หรือลากรูปมาวางตรงไหนก็ได้ในกรอบนี้",
  },
  "pf.dropShots": { en: "Drop screenshots here", th: "ลากรูปมาวางตรงนี้" },
  "pf.dropShotsHint": {
    en: "They go in at the end; move them where you want them",
    th: "รูปจะไปต่อท้าย แล้วค่อยเลื่อนไปตรงที่ต้องการ",
  },
  "pf.planText": {
    en: "Details — the plan, what to bring, anything worth saying",
    th: "เขียนรายละเอียด เช่น แผนการเล่น หรือสิ่งที่ต้องเตรียม",
  },
  "pf.caption": { en: "Caption (optional)", th: "คำบรรยาย (ไม่ใส่ก็ได้)" },
  "pf.moveUp": { en: "Move up", th: "เลื่อนขึ้น" },
  "pf.moveDown": { en: "Move down", th: "เลื่อนลง" },
  "pf.uploading": { en: "uploading {n}…", th: "กำลังอัปโหลด {n} รูป…" },
  "pf.tooBig": { en: "That picture is too large.", th: "รูปใหญ่เกินไป" },
  "pf.notPicture": { en: "That is not a picture.", th: "ไฟล์นี้ไม่ใช่รูป" },

  /* Seats. */
  "pf.pickOwnSeat": { en: "Pick your own seat first", th: "เลือกตำแหน่งของตัวเองก่อน" },
  "pf.seatsHint": {
    en: "Seats — click one to fill it, invite somebody, or set their flex",
    th: "ตำแหน่ง — คลิกเพื่อใส่คน ชวนคน หรือตั้ง flex",
  },
  /* An alliance is three parties, and every list of its seats says which. */
  "pf.partyWing": { en: "Party {wing}", th: "ปาร์ตี้ {wing}" },
  "pf.onePerJob": { en: "One player per job", th: "หนึ่งคน/อาชีพ" },
  "pf.onePerJobWhy": {
    en: "— no two people on the same job",
    th: "— ห้ามซ้ำอาชีพกัน",
  },
  "pf.onePerJobOn": { en: "one player per job is on", th: "เปิดหนึ่งคนหนึ่งอาชีพอยู่" },
  "pf.noDouble": {
    en: "Nobody in this party doubles up on a job",
    th: "ปาร์ตี้นี้ไม่มีใครเล่นอาชีพซ้ำกัน",
  },
  "pf.open": { en: "Open", th: "ว่าง" },
  "pf.openToAll": { en: "Open to all", th: "ใครมาก็ได้" },
  /* Plain words and no badge. A mark saying "full" would be the board drawing
     attention to the rows with nothing left in them. */
  "pf.full": { en: "Full", th: "เต็มแล้ว" },
  /* "ขาด 4 Tank", not "4 Tank". The number and the role alone read as a count
     of who is in the party rather than of who is missing from it — which are
     opposite facts wearing the same two words. */
  "pf.needRole": { en: "needs {n} {role}", th: "ขาด {n} {role}" },
  "pf.wantMore": { en: "needs {n} more · any role", th: "ขาดอีก {n} · ตำแหน่งไหนก็ได้" },
  // Without "any role", which is a promise the party cannot keep: six open
  // seats and two members who can move is not room for two tanks when only one
  // tank seat is open. The seat grid beside it says which chairs are going.
  "pf.needMore": { en: "needs {n} more", th: "ขาดอีก {n} คน" },
  "pf.flexingN": { en: "{n} flexing", th: "flex {n}" },
  "pf.flexingWhy": {
    en: "{n} in the party have not settled on a seat yet",
    th: "มี {n} คนในปาร์ตี้ที่ยังไม่ลงตำแหน่งแน่นอน",
  },
  "pf.awaitingReply": { en: "awaiting reply", th: "รอตอบรับ" },
  "pf.askedShort": { en: "being invited", th: "กำลังจะชวนเข้า Party" },
  "pf.outsideFc": { en: "outside the FC", th: "คนนอก FC" },
  "pf.notOnSite": { en: "Not on this site", th: "ไม่ได้อยู่ในเว็บนี้" },
  "pf.stillSettling": {
    en: "Seats still being settled between people already in",
    th: "ตำแหน่งยังสลับกันได้ในหมู่คนที่อยู่แล้ว",
  },
  "pf.jobsFor": { en: "Jobs for {seat}", th: "อาชีพสำหรับ {seat}" },
  "party.jobAny": { en: "Any job", th: "อะไรก็ได้" },
  "party.jobAnyWhy": {
    en: "Whatever the party is short of",
    th: "แล้วแต่ปาร์ตี้ขาดอะไร",
  },
  "pf.anyJob": { en: "any job", th: "อาชีพไหนก็ได้" },
  "pf.alreadyOn": {
    en: "Somebody in the party is already on this",
    th: "มีคนในปาร์ตี้เล่นอาชีพนี้อยู่แล้ว",
  },
  "pf.openToAny": { en: "Open to any {role}", th: "เปิดให้ {role} ทุกอาชีพ" },
  "pf.openToN": { en: "Open to {n}:", th: "เปิดให้ {n} อาชีพ:" },
  "pf.seatShut": {
    en: "Nothing can take this seat — loosen it, or nobody can join.",
    th: "ไม่มีอาชีพไหนลงตำแหน่งนี้ได้ ลดเงื่อนไขลง ไม่งั้นไม่มีใครเข้าได้",
  },
  "pf.jobsN": { en: "{n} jobs", th: "{n} อาชีพ" },

  /* Adding people. */
  "pf.canAlsoPlay": { en: "Can also play", th: "เล่นได้อีก" },
  "pf.anything": { en: "Anything", th: "ทุกตำแหน่ง" },
  "pf.whatCanPlay": { en: "What can {name} play?", th: "{name} เล่นอะไรได้บ้าง" },
  "pf.pickOneThing": {
    en: "Pick at least one thing they can play, or put them in a seat instead.",
    th: "เลือกอย่างน้อยหนึ่งอย่างที่เขาเล่นได้ หรือใส่ลงตำแหน่งไปเลย",
  },
  "pf.addNamed": { en: "Add “{name}”", th: "เพิ่ม “{name}”" },
  "pf.outsiderHint": {
    en: "Somebody from outside the FC, or not on this site",
    th: "คนนอก FC หรือคนที่ไม่ได้อยู่ในเว็บนี้",
  },
  "pf.searchRoster": { en: "Search the roster…", th: "ค้นหาสมาชิก…" },

  /* ── Who to ask for a seat ─────────────────────────────────────────
     Every fact behind these is already on the site — the jobs and the
     clears from FF Logs, the hours from the grid people fill in
     themselves. The line under each name says which of them put that
     name there, because a list that has quietly reordered itself is a
     list nobody trusts. */
  "pf.suggested": { en: "Suggested · {want}", th: "แนะนำ · {want}" },
  "pf.freeThen": { en: "Only people free then", th: "เฉพาะคนที่ว่างช่วงนั้น" },
  "pf.nobodyFree": {
    en: "Nobody who fits this seat has said they play then.",
    th: "ไม่มีใครที่เล่นตำแหน่งนี้ได้ระบุว่าว่างช่วงนั้น",
  },
  "pf.hasCleared": { en: "cleared it", th: "ผ่านแล้ว" },
  "pf.clearedOn": { en: "cleared it on {job}", th: "ผ่านแล้วด้วย {job}" },
  "pf.clearedElsewhere": {
    en: "knows it, on another role",
    th: "เคยผ่านแล้ว แต่เล่นคนละ role",
  },
  "pf.isLearning": { en: "learning it", th: "กำลังฝึกอยู่" },
  "pf.nPulls": { en: "{n} pulls", th: "{n} pull" },
  "pf.freeAtTime": { en: "usually free then", th: "ปกติว่างช่วงนี้" },
  "pf.offConvention": { en: "off the usual spot", th: "ไม่ใช่ตำแหน่งที่ปกติเล่น" },
  "pf.moreSuggestions": { en: "{n} more", th: "อีก {n} คน" },
  "pf.addFlexer": { en: "Add somebody to the party…", th: "เพิ่มคนใน Party" },
  "pf.flexibleNoSeat": { en: "Flexible — no seat yet", th: "Flex — ยังไม่มีตำแหน่ง" },
  "pf.flexHint": {
    en: "They show on every seat they could take, and drop into whichever one is left.",
    th: "จะขึ้นบนทุกตำแหน่งที่เขาเล่นได้ แล้วลงตำแหน่งที่เหลือ",
  },
  "pf.iWillFlex": { en: "I will flex", th: "คุณ flex เอง" },
  "pf.iAmComing": { en: "I am coming", th: "คุณไปด้วย" },
  "pf.whoIsComing": { en: "Who is coming", th: "ใครไปบ้าง" },
  "pf.openNoParty": {
    en: "Nobody is in a party — everybody queues on their own.",
    th: "ไม่มีการจัดปาร์ตี้",
  },
  "pf.past": {
    en: "That is already past — pick a later time.",
    th: "เวลานี้ผ่านไปแล้ว เลือกเวลาข้างหน้า",
  },
  // Not a complaint. The party started, the lead is editing something else,
  // and the form is only saying it knows.
  "pf.addPeople": { en: "Who is in it", th: "ใครอยู่ในปาร์ตี้" },
  // Drawn but not editable. Whether somebody agreed to come is their answer,
  // and the lead changing it here would be answering on their behalf.
  "pf.alreadyIn": { en: "already in", th: "อยู่แล้ว" },
  // Over when the lead says so. "จบปาร์ตี้" rather than "ยกเลิก": the party is
  // not being taken back, it is being called finished, which is the same word
  // whether it ran long, ran short, or never happened at all.
  // Said by the clock, to the room. See the notice in PartyComments.
  // Named by its time rather than its title: the title is the fight, and two
  // parties on the same fight are told apart by when they start.
  "party.clash": {
    en: "You are already in a party at that time ({when}).",
    th: "คุณมีนัดเล่นปาร์ตี้อื่นในเวลานั้นอยู่แล้ว ({when})",
  },
  "party.timeToInvite": {
    en: "It is time — invite everybody into the party.",
    th: "ถึงเวลาแล้ว ชวนทุกคนเข้าปาร์ตี้ในเกมได้เลย",
  },
  "party.invitesOut": {
    en: "{n} invited, not answered yet",
    th: "ชวนไปแล้ว {n} คน ยังไม่ตอบ",
  },
  "party.withdrawInvite": { en: "withdraw", th: "ถอนคำเชิญ" },
  // Not a failure of theirs, and said as a fact rather than a refusal: the
  // party filled while they were thinking about it.
  "party.tooLateFull": {
    en: "This party filled up before you accepted.",
    th: "ปาร์ตี้เต็มก่อนที่คุณจะกดตอบรับพอดีครับ",
  },
  "party.jobOptional": { en: "Job (optional)", th: "อาชีพ (ไม่บังคับ)" },
  "party.confirmSeat": { en: "Confirm", th: "ยืนยัน" },
  // "Flex", the word the FC already uses, and the same word the chip under a
  // seated member's name uses — because it is the same thing. Not "bench" and
  // not "no seat yet": a substitute might not play, and "not picked yet" is a
  // blank where these people gave an answer. Somebody who ticked all four DPS
  // seats chose four seats, and somebody who ticked none chose the widest
  // offer there is. Both decided; neither is waiting to.
  "party.bench": { en: "Flex", th: "Flex" },
  "party.benchEmpty": { en: "nobody yet", th: "ยังไม่มีใคร" },
  "party.sitHere": { en: "Take {seat}?", th: "นั่งตำแหน่ง {seat} ไหม?" },
  "party.moveHere": { en: "Move to {seat}?", th: "ย้ายไปนั่ง {seat} ไหม?" },
  "party.theyWouldMove": {
    en: " {who} offered to move, and would give it up.",
    th: " {who} เสนอไว้ว่าย้ายตำแหน่งได้ และจะสละที่นั่งนี้ให้",
  },
  "party.acceptInto": {
    en: "Accept the invitation and take {seat}?",
    th: "ตอบรับคำเชิญแล้วนั่ง {seat} เลยไหม?",
  },
  "party.standUp": { en: "Go flex", th: "มาเป็น Flex" },
  "party.toBench": {
    en: "Give up your seat and go flex?",
    th: "สละที่นั่ง แล้วมาเป็น Flex ไหม?",
  },
  "party.editFlex": {
    en: "Which seats can you play?", th: "เล่นตำแหน่งไหนได้บ้าง?",
  },
  // Nothing picked is the widest offer and the shortest thing to do, so the
  // common answer stays one press — but it is an answer, not a blank.
  "party.benchAny": {
    en: "Nothing picked — wherever you are needed.",
    th: "ไม่เลือก = เล่นตำแหน่งไหนก็ได้ ตามที่ปาร์ตี้ขาด",
  },
  "party.benchThese": {
    en: "You will play one of these.", th: "จะได้เล่นหนึ่งในนี้",
  },
  "party.invitedPick": {
    en: "Accept first — you choose your own position afterwards.",
    th: "กดตอบรับก่อน แล้วเลือกตำแหน่งเองได้",
  },
  // Said once under the list rather than against every name, because it is
  // the rule the list runs on and not a fact about any one person in it.
  "party.invitesWhy": {
    en: "They are not in the party until they accept, and they choose their own position.",
    th: "ยังไม่นับเป็นสมาชิกจนกว่าจะกดตอบรับ และเลือกตำแหน่งเองได้",
  },
  "party.overNow": {
    en: "This party has ended.",
    th: "ปาร์ตี้นี้จบแล้ว",
  },
  "pf.endParty": { en: "End party", th: "จบปาร์ตี้" },
  "pf.reopenParty": { en: "Reopen", th: "เปิดปาร์ตี้อีกครั้ง" },
  "pf.endAsk": {
    en: "End this party now? It stays on the board with everything in it, but nobody can join it any more.",
    th: "จบปาร์ตี้นี้เลยไหม? ปาร์ตี้จะยังอยู่พร้อมข้อความทั้งหมด แต่จะไม่มีใครเข้าร่วมได้อีก",
  },
  "pf.alreadyStarted": {
    en: "This party has already started. Saving will not move it.",
    th: "ปาร์ตี้นี้เริ่มไปแล้ว บันทึกได้โดยไม่ต้องเปลี่ยนเวลา",
  },
  "pf.playing": { en: "Playing", th: "เล่น" },
  "pf.takeOut": { en: "Take them out of this seat", th: "เอาออกจากตำแหน่งนี้" },
  "pf.thatIsMe": { en: "That is me", th: "ตรงนี้คือคุณ" },
  "pf.askedHere": {
    en: "Asked about this seat: {who}",
    th: "ชวนมาที่นี่แล้ว: {who}",
  },
  "pf.lookAgain": { en: "Look for somebody after all", th: "กลับมาหาคนตำแหน่งนี้" },
  "pf.notLooking": {
    en: "Not looking — somebody has this seat already",
    th: "ไม่หาคนตำแหน่งนี้/มีคนอื่นลงตำแหน่งนี้แล้ว",
  },
  "pf.invitedNotBooked": {
    en: "Anybody you place is invited, not booked — the seat says “awaiting reply” until they accept, the same as a photo tag. Somebody from outside is taken at your word.",
    th: "ใครที่คุณใส่ลงไปถือเป็นการชวน ยังไม่ใช่การจอง ตำแหน่งจะขึ้นว่า “รอตอบรับ” จนกว่าเขาจะรับ เหมือนแท็กรูป ส่วนคนนอกเว็บถือตามที่คุณบอก",
  },
  "pf.putUp": { en: "Put it on the board", th: "ลงบอร์ด" },
  "pf.putting": { en: "Putting it up…", th: "กำลังลง…" },
  "pf.pickContentFirst": {
    en: "Pick what you are running.",
    th: "เลือกก่อนว่าจะเล่นอะไร",
  },
  "pf.titleFirst": {
    en: "Give it a title first.",
    th: "ใส่หัวข้อของปาร์ตี้ก่อน",
  },
  "pf.yourSpot": { en: "Your position", th: "ตำแหน่งของคุณ" },
  "pf.yourSpotWhy": {
    en: "Only yours. Everybody else answers for themselves.",
    th: "แก้ได้เฉพาะของคุณ คนอื่นตอบเองจากหน้าปาร์ตี้",
  },
  "pf.flexibleSpot": { en: "Any position", th: "เล่นได้ทุกตำแหน่ง" },
  "pf.imComing": { en: "I'm coming", th: "ฉันไปด้วย" },
  "pf.notInParty": { en: "Not in the party", th: "ไม่อยู่ในปาร์ตี้" },
  // The form's own version of the join-side warning. Same fact, said where
  // the hours are being chosen rather than where a seat is.
  "pf.clashBusy": {
    en: "You are already in another party at that time.",
    th: "คุณมีนัดเล่นปาร์ตี้อื่นในเวลานี้อยู่แล้ว",
  },
  "pf.takeSeatFirst": {
    en: "Take your own seat first.",
    th: "เลือกตำแหน่งของตัวเองก่อน",
  },

  /* The conversation under a party. */
  "pf.comments": { en: "Comments", th: "ความคิดเห็น" },
  "pf.commentsN": { en: "{n} comments", th: "{n} ความคิดเห็น" },
  "pf.commentOne": { en: "1 comment", th: "1 ความคิดเห็น" },
  "pf.comment": { en: "Comment", th: "ส่ง" },
  "party.mentionAll": { en: "everyone here", th: "ทุกคนในปาร์ตี้" },
  "party.mentionGuest": { en: "guest", th: "แขก" },
  "party.reply": { en: "Reply", th: "ตอบกลับ" },
  "party.replyingTo": { en: "Replying to", th: "ตอบกลับ" },
  "party.msgGone": { en: "Message deleted", th: "ข้อความถูกลบ" },
  "party.msgEdited": { en: "edited {at}", th: "แก้ไข {at}" },
  "party.msgDeleteAsk": {
    en: "Delete this message? It leaves a line saying it was deleted.",
    th: "ลบข้อความนี้ไหม จะเหลือบรรทัดที่บอกว่าข้อความถูกลบ",
  },
  "party.msgSave": { en: "Save", th: "บันทึก" },
  "pf.react": { en: "React", th: "แสดงความรู้สึก" },
  "pf.commentBox": {
    en: "Message everybody in this party…",
    th: "ส่งข้อความหาสมาชิก Party นี้…",
  },
  // Paste named first: Shift+PrintScreen puts a screenshot on the clipboard
  // and nowhere else, so pasting is the short way and dragging is the one
  // that needs the file saved out first.
  "pf.orDropShot": {
    en: "paste a screenshot (Ctrl+V) or drop one in here",
    th: "วางรูปได้เลย (Ctrl+V) หรือลากรูปมาวางตรงนี้",
  },

  /* ── The tell button ───────────────────────────────────────────────
     On every list of people, because every list of people is a list of
     people somebody eventually wants to talk to. */
  "tell.copy": { en: "Copy the /tell", th: "คัดลอกคำสั่ง /tell" },
  "tell.copyFor": { en: "Copy a /tell for {name}", th: "คัดลอก /tell หา {name}" },
  "tell.copied": { en: "Copied", th: "คัดลอกแล้ว" },
  /* The game's own words, in both languages, like "Send popoto" beside it. */
  "tell.send": { en: "Send in-game tell", th: "Send in-game tell" },

  "common.edit": { en: "Edit", th: "แก้ไข" },
  "common.noData": { en: "No data", th: "ไม่มีข้อมูล" },
} satisfies Record<string, Entry>;

export type Key = keyof typeof DICT;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Interpolates {name} placeholders from `vars`. */
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const LangCtx = createContext<Ctx | null>(null);

/**
 * Thai is the default because the FC is Thai. The English text stays the source
 * of truth in the dictionary — the data behind this site is in English, and a
 * missing translation should read as English rather than as a blank.
 */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  // localStorage first so the choice survives a reload without waiting on the
  // network, then whatever the signed-in member saved — that is the one that
  // should win across devices.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "th" || saved === "en") setLangState(saved);
    } catch { /* private mode */ }

    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: row } = await supabase
        .from("profiles").select("language").eq("id", data.user.id).maybeSingle();
      const pref = (row as { language?: string } | null)?.language;
      if (pref === "th" || pref === "en") {
        setLangState(pref);
        try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* private mode */ }
      }
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* private mode */ }
    // Saved to the profile too, so the choice follows the member to any device.
    // Failure is silent on purpose: the language is already applied locally, and
    // an error toast about it would be louder than the setting deserves.
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from("profiles")
          .update({ language: l }).eq("id", data.user.id);
      }
    })();
  }, []);

  const t = useCallback((key: Key, vars?: Record<string, string | number>) => {
    const entry = DICT[key] as Entry | undefined;
    let out = entry ? entry[lang] || entry.en : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    }
    return out;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangCtx);
  // Server-rendered pieces and tests can call this outside the provider; falling
  // back to English keeps them rendering rather than throwing.
  if (!ctx) {
    return {
      lang: "en",
      setLang: () => {},
      t: (key, vars) => {
        const entry = DICT[key] as Entry | undefined;
        let out = entry ? entry.en : key;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
        }
        return out;
      },
    };
  }
  return ctx;
}

/**
 * For a block that carries its own language toggle — the front-page how-to, the
 * tag glossary, the collection help. It starts in whatever the site is set to and
 * can be flipped on its own without changing the rest of the page, which is how
 * those blocks already behaved.
 */
export function useSectionLang(): [Lang, () => void] {
  const { lang } = useLang();
  const [override, setOverride] = useState<Lang | null>(null);
  const effective = override ?? lang;
  return [effective, () => setOverride(effective === "th" ? "en" : "th")];
}
