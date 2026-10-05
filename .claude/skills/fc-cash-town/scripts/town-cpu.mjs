// What Cash Town costs a machine while somebody stands in it (the owner, 2026-10-05: "คนใน cashtown เล่นแล้วใช้ CPU
// เยอะมาก"): a trace of the whole browser on the dev test room, each thread's CPU time summed, by process and by
// thread, and what the page's main thread spent it on.
//
// What to read in it:
// - "Renderer" and "GPU Process" are the town's: the page, and the drawing done for it. The page's own script is
//   only a part ("FunctionCall" in the main thread's line): most of what a frame costs is the browser putting a
//   canvas the size of the window on the screen, whatever was drawn on it. So how many frames is what matters.
// - "Browser" is not the town's: a new profile fetches things of its own for a while.
// - "per second: FireAnimationFrame" is how often the page is woken for a frame; the fps at the head is how many it
//   draws. On a screen faster than the pace the two were far apart until the page slept between frames
//   (lib/town/pace's Screen).
// - headless Chrome asks for frames at the rate of this machine's own screen and draws with its GPU: the numbers are
//   this machine's. A member's laptop has a slower core and a weaker GPU: read the before and the after against
//   each other, not as what anybody will see.
//
// Never edit the files of the tree the server runs from while this measures: a hot reload restarts the map's loop.
// One run at a time: two browsers measured at once are measured wrong.
//
//   node town-cpu.mjs <base> <label> <name>=<query> [<name>=<query> …]
//     e.g.  node town-cpu.mjs http://localhost:3100 after "noon=townHour=12&townWeather=clear" "heavy=townHour=12&townWeather=heavy"
//   TOWN_SECS=8       how long each is traced
//   TOWN_WAIT=7000    how long after the town is ready the trace begins (24000: the map has gone to rest by then)
//   TOWN_TOUCH=1      the page is touched twice a second all the while: the map never rests
//   TOWN_FOCUS=0      the window is not the one in front
//   TOWN_EVAL=<js>    run in the page first (to switch something off and see what it cost, say
//                     "CanvasRenderingContext2D.prototype.stroke=function(){}")
//   TOWN_THREAD=<part of a thread's name>   what that thread's time went on, by the tasks' own names
//   TOWN_W, TOWN_H, TOWN_DPR                the window (1600 × 900 at 1)
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", LABEL = "town", ...ASKED] = process.argv.slice(2);
const SECS = Number(process.env.TOWN_SECS ?? 8);
const SIZE = { width: Number(process.env.TOWN_W ?? 1600), height: Number(process.env.TOWN_H ?? 900), dpr: Number(process.env.TOWN_DPR ?? 1) };
const scenarios = (ASKED.length ? ASKED : ["noon=townHour=12&townWeather=clear"]).map((s) => { const i = s.indexOf("="); return { name: s.slice(0, i), query: s.slice(i + 1) }; });

for (const sc of scenarios) {
  const X = await browser("CPU", SIZE);
  try {
    await X.goto(`${BASE}/town?townTest=A&townRoom=cpu&${sc.query}`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the map's handle", () => X.evaluate("!!window.__townView?.sky && !!window.__cashTown?.me"), 60000);
    if (process.env.TOWN_TOUCH === "1") await X.evaluate(`(setInterval(() => window.dispatchEvent(new Event("pointermove")), 500), 1)`);
    if (process.env.TOWN_EVAL) await X.evaluate(process.env.TOWN_EVAL);
    if (process.env.TOWN_FOCUS === "0") await X.send("Emulation.setFocusEmulationEnabled", { enabled: false });
    await sleep(Number(process.env.TOWN_WAIT ?? 7000));
    const events = [];
    let done;
    const ended = new Promise((r) => (done = r));
    X.ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Tracing.dataCollected") events.push(...m.params.value);
      else if (m.method === "Tracing.tracingComplete") done();
    });
    await X.send("Tracing.start", { traceConfig: { includedCategories: ["toplevel", "__metadata", "disabled-by-default-devtools.timeline", "devtools.timeline"], recordMode: "recordAsMuchAsPossible" }, transferMode: "ReportEvents" });
    await sleep(SECS * 1000);
    const seen = await X.evaluate(`(() => { const s = window.__townView.sky(), c = document.querySelector("canvas"); return { fps: s.fps, pace: s.pace, paceNow: s.paceNow ?? s.pace, front: document.hasFocus(), canvas: c.width + "x" + c.height, others: window.__cashTown.people().length }; })()`);
    await X.send("Tracing.end");
    await ended;
    const procName = new Map(), threadName = new Map();
    for (const e of events) {
      if (e.ph !== "M") continue;
      if (e.name === "process_name") procName.set(e.pid, e.args.name);
      if (e.name === "thread_name") threadName.set(`${e.pid}:${e.tid}`, e.args.name);
    }
    let lo = Infinity, hi = 0;
    for (const e of events) if (e.ph === "X" && e.ts) { lo = Math.min(lo, e.ts); hi = Math.max(hi, e.ts + (e.dur ?? 0)); }
    const span = (hi - lo) / 1000;
    // each thread's CPU: the thread time of its outermost tasks
    const TOP = new Set(["ThreadControllerImpl::RunTask", "ThreadPool_RunTask", "RunTask", "SimpleThread::Run"]);
    const byThread = new Map(), open = new Map();
    const tasks = events.filter((e) => e.ph === "X" && TOP.has(e.name)).sort((a, b) => a.ts - b.ts);
    for (const e of tasks) {
      const k = `${e.pid}:${e.tid}`;
      if (e.ts < (open.get(k) ?? 0)) continue;
      open.set(k, e.ts + (e.dur ?? 0));
      const row = byThread.get(k) ?? { cpu: 0, n: 0 };
      row.cpu += (e.tdur ?? e.dur ?? 0) / 1000; row.n++;
      byThread.set(k, row);
    }
    const rows = [...byThread].map(([k, r]) => ({ who: `${procName.get(Number(k.split(":")[0])) ?? "?"} / ${threadName.get(k) ?? k}`, ...r })).sort((a, b) => b.cpu - a.cpu);
    const byProc = new Map();
    for (const r of rows) { const p = r.who.split(" / ")[0]; byProc.set(p, (byProc.get(p) ?? 0) + r.cpu); }
    const pct = (ms) => (ms / span * 100).toFixed(1);
    const town = (byProc.get("Renderer") ?? 0) + (byProc.get("GPU Process") ?? 0);
    console.log(`\n== ${LABEL} / ${sc.name}: drew ${seen.fps} a second (pace ${seen.paceNow} of ${seen.pace}${seen.front ? "" : ", window behind"}), canvas ${seen.canvas}, ${seen.others} others, ${(span / 1000).toFixed(1)} s traced`);
    console.log(`   the town (page + GPU process): ${pct(town)}% of one core   [${[...byProc].map(([p, ms]) => `${p} ${pct(ms)}`).join(", ")}]`);
    for (const r of rows.filter((r) => !r.who.startsWith("Browser")).slice(0, 6)) console.log(`   ${pct(r.cpu).padStart(5)}%  ${r.who}  (${Math.round(r.n / (span / 1000))} tasks/s)`);
    // the page's main thread, by kind of work (self time)
    const main = [...threadName].find(([k, n]) => n === "CrRendererMain" && procName.get(Number(k.split(":")[0])) === "Renderer" && (byThread.get(k)?.cpu ?? 0) > 50)?.[0];
    if (main) {
      const mine = events.filter((e) => e.ph === "X" && `${e.pid}:${e.tid}` === main && e.dur !== undefined).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
      const self = new Map(), stack = [], counts = {};
      for (const e of mine) {
        while (stack.length && stack[stack.length - 1].end <= e.ts) stack.pop();
        if (stack.length) { const p = stack[stack.length - 1]; self.set(p.name, (self.get(p.name) ?? 0) - e.dur / 1000); }
        self.set(e.name, (self.get(e.name) ?? 0) + e.dur / 1000);
        stack.push({ name: e.name, end: e.ts + e.dur });
        if (["FireAnimationFrame", "Commit", "TimerFire", "MinorGC", "MajorGC", "Layout"].includes(e.name)) counts[e.name] = (counts[e.name] ?? 0) + 1;
      }
      console.log("   main thread: " + [...self].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, ms]) => `${n} ${pct(ms)}%`).join(", "));
      console.log("   per second: " + Object.entries(counts).map(([n, c]) => `${n} ${Math.round(c / (span / 1000))}`).join(", "));
    }
    if (process.env.TOWN_THREAD) for (const [k, n] of threadName) {
      if (!n.includes(process.env.TOWN_THREAD)) continue;
      const by = new Map();
      for (const e of events) {
        if (e.ph !== "X" || `${e.pid}:${e.tid}` !== k) continue;
        const key = e.name + (e.args?.src_file ? ` ${String(e.args.src_file).split(/[\\/]/).slice(-2).join("/")}:${e.args.src_func ?? ""}` : "");
        const r = by.get(key) ?? [0, 0]; r[0] += (e.dur ?? 0) / 1000; r[1]++; by.set(key, r);
      }
      const top = [...by].sort((a, b) => b[1][0] - a[1][0]).slice(0, 8);
      if (top.length && top[0][1][0] > 20) console.log(`   ${procName.get(Number(k.split(":")[0]))} / ${n}: ` + top.map(([name, [ms, c]]) => `${name} ${pct(ms)}% ×${Math.round(c / (span / 1000))}/s`).join(" | "));
    }
    if (X.logs.length) console.log("   page errors:", X.logs.slice(0, 3));
  } catch (e) {
    console.log("ERR", e.stack ?? e.message);
  } finally { X.close(); await sleep(900); }
}
setTimeout(() => process.exit(0), 1200);
