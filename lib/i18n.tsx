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
  "nav.profile": { en: "My profile", th: "โปรไฟล์ของฉัน" },
  "nav.admin": { en: "Admin panel", th: "หน้าผู้ดูแล" },
  "nav.language": { en: "Language", th: "ภาษา" },
  "nav.gallery": { en: "Gallery", th: "แกลเลอรี" },

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
  "gallery.popoto": { en: "Popoto", th: "Popoto" },
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
  "gallery.restore": { en: "Restore", th: "เอากลับมา" },
  "gallery.hiddenTag": { en: "Hidden", th: "ซ่อนอยู่" },
  "gallery.editCaption": { en: "Edit caption", th: "แก้คำบรรยาย" },
  "gallery.save": { en: "Save", th: "บันทึก" },
  "gallery.noCaption": { en: "No caption", th: "ยังไม่มีคำบรรยาย" },
  "gallery.search": {
    en: "Search captions or who posted…",
    th: "ค้นจากคำบรรยาย หรือชื่อคนโพสต์…",
  },
  "gallery.sortHot": { en: "Hot right now", th: "กำลังฮิต" },
  "gallery.sortNew": { en: "Newest", th: "ใหม่สุด" },
  "gallery.sortTop": { en: "Most popoto", th: "popoto เยอะสุด" },
  "gallery.loadingMore": { en: "Loading more…", th: "กำลังโหลดเพิ่ม…" },
  "gallery.hotHeading": { en: "Lately in the gallery", th: "รูปที่กำลังฮิต" },
  "gallery.seeAll": { en: "See all", th: "ดูทั้งหมด" },
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
  "gallery.tagPinned": { en: "Pinned on the picture", th: "ปักหมุดไว้ในรูป" },
  "gallery.tagShowAll": { en: "Show everyone", th: "แสดงแท็กทั้งหมด" },
  "gallery.tagHideAll": { en: "Hide the tags", th: "ซ่อนแท็ก" },
  "profile.pictures": { en: "Your pictures", th: "รูปของคุณ" },
  "profile.picturesHint": {
    en: "Your portrait is used everywhere the site names you. Your cover only sits at the top of your own page.",
    th: "รูปโปรไฟล์จะถูกใช้ทุกที่ที่เว็บแสดงชื่อคุณ ส่วนรูปปกจะขึ้นแค่ด้านบนหน้าตัวเองเท่านั้น",
  },
  "profile.picAvatar": { en: "Portrait", th: "รูปโปรไฟล์" },
  "profile.picCover": { en: "Cover", th: "รูปปก" },
  "profile.picFromGallery": { en: "From the gallery", th: "เลือกจากแกลเลอรี" },
  "profile.picUpload": { en: "Upload a file", th: "อัพโหลดไฟล์" },
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
  "gallery.addImages": { en: "Add pictures", th: "เพิ่มรูป" },
  "gallery.removeImage": { en: "Remove this picture", th: "ลบรูปนี้" },
  "gallery.imageOf": { en: "{n} of {total}", th: "รูปที่ {n} จาก {total}" },
  "gallery.prev": { en: "Previous picture", th: "รูปก่อนหน้า" },
  "gallery.next": { en: "Next picture", th: "รูปถัดไป" },
  "gallery.chooseMany": {
    en: "Choose pictures — several at once is fine",
    th: "เลือกรูป จะเลือกทีละหลายรูปก็ได้",
  },
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
  "home.active": { en: "Active", th: "ยัง Active" },
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
  "board.showingActive": {
    en: "Showing {shown} active of {total} members",
    th: "แสดง {shown} คนที่ Active จาก {total} คน",
  },
  "board.showingVacation": {
    en: "Showing {shown} on-vacation of {total} members",
    th: "แสดง {shown} คนที่พักอยู่ จาก {total} คน",
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
  "member.progressing": { en: "Progressing:", th: "กำลังตี:" },
  "member.justCleared": { en: "Just cleared:", th: "เพิ่งผ่าน:" },
  "member.inProgress": { en: "Raiding lately", th: "ช่วงนี้กำลังตี" },
  "member.progressHint": {
    en: "Read from this player's own logs over the last 10 days. A boss still being learned shows how much health was left on the best pull and which phase that was — lower is further in. One that died shows as cleared instead. Content does not matter, only recency: an old Ultimate pulled last week belongs here, and a tier nobody has touched in a fortnight does not.",
    th: "อ่านจาก log ของคนนั้นเองในช่วง 10 วันล่าสุด บอสที่ยังตีอยู่จะบอกว่าครั้งที่ดีที่สุดเหลือเลือดบอสเท่าไหร่ และอยู่ Phase ไหน — ยิ่งเลขน้อยยิ่งใกล้จบ ส่วนตัวที่ผ่านแล้วจะขึ้นว่าเพิ่งผ่าน ไม่เกี่ยงว่าเป็น content ไหน เกี่ยงแค่ว่าเพิ่งเล่นหรือเปล่า Ultimate เก่าที่เพิ่งลงเมื่ออาทิตย์ที่แล้วก็ขึ้น ส่วน tier ที่ไม่ได้แตะมาสองอาทิตย์ก็ไม่ขึ้น",
  },
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
  "member.rarestHint": {
    en: "({n} shown, rarest first · the chip names the playstyle it counts toward)",
    th: "(แสดง {n} อัน เรียงจากหายากที่สุด · ป้ายสีบอกว่านับเข้าสายไหน)",
  },
  "member.showAll": { en: "Show all {n}", th: "แสดงทั้งหมด {n} อัน" },
  "member.showFewer": { en: "Show fewer", th: "แสดงน้อยลง" },

  // ── Profile ─────────────────────────────────────────────────────────
  "profile.title": { en: "My profile", th: "โปรไฟล์ของฉัน" },
  "profile.waysToSignIn": { en: "Ways to sign in", th: "ช่องทางเข้าสู่ระบบ" },
  "profile.waysHint": {
    en: "Link a second one and either will get you back to this same profile. Worth doing before you need it.",
    th: "ผูกช่องทางที่สองไว้ แล้วจะเข้าด้วยทางไหนก็ได้ กลับมาที่โปรไฟล์เดียวกัน ควรทำไว้ก่อนที่จะต้องใช้",
  },
  "profile.link": { en: "Link {name}", th: "ผูก {name}" },
  "profile.myCharacter": { en: "My character", th: "ตัวละครของฉัน" },
  "profile.viewMyPage": { en: "View my page", th: "ดูหน้าของฉัน" },
  "profile.unlink": { en: "Unlink", th: "ยกเลิกการผูก" },
  "profile.customise": { en: "Customise profile", th: "ปรับแต่งโปรไฟล์" },
  "profile.nickname": { en: "Nickname", th: "ชื่อเล่น" },
  "profile.birthday": { en: "Birthday (day and month only)", th: "วันเกิด (เอาแค่วันกับเดือน)" },
  "profile.clear": { en: "clear", th: "ล้าง" },
  "profile.bio": { en: "About me", th: "เกี่ยวกับฉัน" },
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
  "lb.eyebrow": { en: "Leaderboards", th: "อันดับ" },
  "lb.title": { en: "Who does what best", th: "ใครเก่งด้านไหน" },
  "lb.empty": {
    en: "Nothing to rank yet. Scores appear once the pipeline has read achievements from FFXIV Collect for members who keep them public.",
    th: "ยังไม่มีข้อมูลให้จัดอันดับ คะแนนจะขึ้นเมื่อระบบอ่าน achievement จาก FFXIV Collect ของคนที่เปิดเป็นสาธารณะได้แล้ว",
  },
  "lb.onVacation": { en: "on vacation", th: "พักอยู่" },

  // ── Shared ──────────────────────────────────────────────────────────
  "common.loading": { en: "Loading…", th: "กำลังโหลด…" },
  "common.cancel": { en: "Cancel", th: "ยกเลิก" },
  "common.delete": { en: "Delete", th: "ลบ" },
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
