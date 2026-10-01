"use client";

/**
 * Cash Town's voice: a line to everybody we should hear, peer to peer, each
 * voice as loud as the town's rules say (lib/town/world: one room, everybody
 * at full volume for now).
 *
 * Peer to peer (a mesh) because it costs nothing: the audio goes straight
 * between the browsers, and only the two messages that introduce them travel
 * through Supabase. Each line uploads the microphone once more, so a crowd
 * talking all at once is what a mesh is worst at; past about eight speakers a
 * server that forwards audio (the Cloudflare SFU in the fc-cash-town skill)
 * should take over, and the stats below are how we will see that point.
 *
 * Two messages per line, not twenty: a browser offers its connection only
 * after it has found every address it could be reached at ("non-trickle"
 * ICE), so the offer and the answer carry everything and no stream of
 * candidates follows. Supabase counts every message, and the first version's
 * candidates were most of them.
 *
 * Volume is the <audio> element's own, not Web Audio's: the element is what
 * Chrome's echo cancellation listens to, so laptop speakers do not feed the
 * other voice back into the microphone. iOS ignores volume but honours muted.
 *
 * Every line carries a name of its own (`pc`), because a line can die on one
 * side only: a tab sleeps, the other side starts a new line, and the sleeper
 * wakes holding the old one. An offer from a new name replaces the old line;
 * anything for a line that no longer exists is dropped. Introductions follow
 * WebRTC's "perfect negotiation": both may offer at once, the polite one
 * gives way.
 */

export type Signal = { pc: string } & (
  | { description: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit | null }
);

export interface PeerInfo {
  id: string;
  pc: string;
  state: RTCPeerConnectionState;
  bytesIn: number;
  bytesOut: number;
  level: number;
  gain: number;
  /** Round trip, ms. */
  rtt: number | null;
  /** Jitter of what arrives, ms. */
  jitter: number | null;
  /** Packets lost of those expected, %, since the line opened. */
  loss: number | null;
  /** What arrives, kbit/s, since the last look. */
  kbpsIn: number | null;
  /** "direct" (host or STUN) or "relay" (TURN); null until connected. */
  path: "direct" | "relay" | null;
}

/**
 * Public STUN only, for now: enough for most home connections, and for the
 * owner and Aqua across theirs. Some mobile networks need a TURN relay, which
 * needs credentials minted by a server; a line that cannot connect says so.
 */
const ICE: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

/** How long a line may be down before it is replaced, not repaired. */
const GIVE_UP_MS = 15_000;

/** The longest we wait to find addresses before offering what we have. */
const GATHER_MS = 2500;

/**
 * Extra buffering on what we hear, ms. A jittery network then plays a little
 * later instead of in pieces; for talking, 120 ms is not noticed.
 */
const JITTER_TARGET_MS = 120;

const newId = () => Math.random().toString(36).slice(2, 10);

class Peer {
  readonly pc: RTCPeerConnection;
  readonly pcId = newId();
  /** The other side's line this one is paired with, once known. */
  remotePc: string | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  audio: HTMLAudioElement | null = null;
  analyser: AnalyserNode | null = null;
  buffer: Float32Array<ArrayBuffer> | null = null;
  gain = 1;
  /** Since when it has not been connected; null while it is. */
  badSince: number | null = Date.now();
  /** For kbit/s: what had arrived, and when, at the last look. */
  lastBytes = 0;
  lastAt = 0;

  constructor(
    readonly id: string,
    private readonly polite: boolean,
    stream: MediaStream,
    private readonly send: (s: Signal) => void,
    private readonly onRemote: (peer: Peer, stream: MediaStream) => void,
    private readonly onState: () => void,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: ICE });
    for (const track of stream.getTracks()) this.pc.addTrack(track, stream);

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        await this.gathered();
        if (this.pc.localDescription) this.send({ pc: this.pcId, description: this.pc.localDescription.toJSON() });
      } catch { /* the other side's offer wins; nothing to undo */ } finally {
        this.makingOffer = false;
      }
    };
    this.pc.ontrack = ({ streams, receiver }) => {
      const r = receiver as RTCRtpReceiver & { jitterBufferTarget?: number | null };
      if ("jitterBufferTarget" in r) {
        try { r.jitterBufferTarget = JITTER_TARGET_MS; } catch { /* not in this browser */ }
      }
      if (streams[0]) this.onRemote(this, streams[0]);
    };
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === "connected") this.badSince = null;
      else if (this.badSince === null) this.badSince = Date.now();
      // A network change (Wi-Fi to 4G) can often be recovered by gathering again.
      if (s === "failed") this.pc.restartIce();
      this.onState();
    };
  }

  /** Until every address is found (or long enough), so one message carries them all. */
  private gathered(): Promise<void> {
    if (this.pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        this.pc.removeEventListener("icegatheringstatechange", check);
        clearTimeout(timer);
        resolve();
      };
      const check = () => { if (this.pc.iceGatheringState === "complete") done(); };
      const timer = setTimeout(done, GATHER_MS);
      this.pc.addEventListener("icegatheringstatechange", check);
    });
  }

  async signal(s: Signal) {
    if ("description" in s) {
      const d = s.description;
      const collision = d.type === "offer" && (this.makingOffer || this.pc.signalingState !== "stable");
      this.ignoreOffer = !this.polite && collision;
      if (this.ignoreOffer) return;
      await this.pc.setRemoteDescription(d);
      if (d.type === "offer") {
        await this.pc.setLocalDescription();
        await this.gathered();
        if (this.pc.localDescription) this.send({ pc: this.pcId, description: this.pc.localDescription.toJSON() });
      }
    } else {
      // Candidates on their own only come from a browser still running the
      // first version; take them, the line works either way.
      try {
        await this.pc.addIceCandidate(s.candidate ?? undefined);
      } catch (e) {
        if (!this.ignoreOffer) throw e;
      }
    }
  }

  close() {
    this.pc.onconnectionstatechange = null;
    this.pc.close();
    if (this.audio) {
      this.audio.srcObject = null;
      this.audio.remove();
    }
  }
}

export class VoiceMesh {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localBuffer: Float32Array<ArrayBuffer> | null = null;
  private peers = new Map<string, Peer>();
  private box: HTMLDivElement | null = null;
  private muted = false;
  private blocked = false;

  constructor(
    private readonly selfId: string,
    private readonly sendTo: (to: string, s: Signal) => void,
    private readonly onChange: () => void,
  ) {}

  get active() { return this.stream !== null; }
  get isMuted() { return this.muted; }
  /**
   * The browser would not play what arrives: autoplay needs a tap on the page
   * first, which a voice resumed after a reload has not had yet.
   */
  get audioBlocked() { return this.blocked; }
  /** Whom there is a line to now, open or still connecting. */
  get lines(): ReadonlySet<string> { return new Set(this.peers.keys()); }

  /**
   * Ask for the microphone and get ready to talk. Must be called from a click:
   * browsers only let a page start audio, and ask for a microphone, when the
   * person did something.
   */
  async start(): Promise<void> {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    this.ctx = new AudioContext();
    await this.ctx.resume().catch(() => {});
    this.localAnalyser = this.analyse(this.stream);
    this.localBuffer = this.localAnalyser ? new Float32Array(this.localAnalyser.fftSize) : null;
    this.box = document.createElement("div");
    this.box.hidden = true;
    this.box.dataset.cashTownAudio = "";
    document.body.appendChild(this.box);
    this.muted = false;
    this.onChange();
  }

  /** After a tap: play what was held back, and wake the speaking rings. */
  resumeAudio() {
    if (!this.blocked && this.ctx?.state !== "suspended") return;
    this.blocked = false;
    void this.ctx?.resume().catch(() => {});
    for (const p of this.peers.values()) this.play(p);
    this.onChange();
  }

  stop() {
    this.blocked = false;
    for (const p of this.peers.values()) p.close();
    this.peers.clear();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.localAnalyser = null;
    this.localBuffer = null;
    this.box?.remove();
    this.box = null;
    this.onChange();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
    this.onChange();
  }

  /** Make the set of lines match whom we should hear now. */
  sync(want: ReadonlySet<string>) {
    if (!this.stream) return;
    let changed = false;
    for (const id of want) {
      if (id !== this.selfId && !this.peers.has(id)) { this.open(id); changed = true; }
    }
    for (const [id, p] of this.peers) {
      if (!want.has(id)) { p.close(); this.peers.delete(id); changed = true; }
    }
    if (changed) this.onChange();
  }

  /**
   * Replace any line that has been down too long. Repairing in place
   * (restartIce) is tried first, when a line says it failed; this is for when
   * that did not work, or when the introductions never got through.
   */
  repair() {
    if (!this.stream) return;
    const now = Date.now();
    for (const [id, p] of [...this.peers]) {
      if (p.badSince !== null && now - p.badSince > GIVE_UP_MS) {
        p.close();
        this.peers.delete(id);
        this.open(id);
      }
    }
  }

  /** A message from somebody else's browser about connecting to us. */
  async receive(from: string, raw: unknown) {
    if (!this.stream || from === this.selfId) return;
    const s = raw as Signal;
    if (!s || typeof s !== "object" || typeof s.pc !== "string") return;
    let peer = this.peers.get(from);
    const isOffer = "description" in s && s.description?.type === "offer";
    if (peer && peer.remotePc && peer.remotePc !== s.pc) {
      // From a line we are not paired with. An offer means they started over,
      // so start over too; anything else is left over from the old one.
      if (!isOffer) return;
      peer.close();
      this.peers.delete(from);
      peer = undefined;
    }
    peer ??= this.open(from);
    peer.remotePc ??= s.pc;
    try {
      await peer.signal(s);
    } catch { /* a stale offer or candidate; the next one will do */ }
  }

  /** Volume of one voice, from 0 (out of range) to 1. */
  setGain(id: string, gain: number) {
    const p = this.peers.get(id);
    if (!p) return;
    const g = Math.max(0, Math.min(1, gain));
    // Only on a real change: this is called every frame.
    if (Math.abs(g - p.gain) < 0.01 && p.audio?.dataset.set === "1") return;
    p.gain = g;
    if (p.audio) {
      p.audio.volume = g;
      p.audio.muted = g < 0.02;
      p.audio.dataset.set = "1";
    }
  }

  /** How loud somebody is speaking right now, 0–1: "me" for the microphone. */
  level(id: string): number {
    let a: AnalyserNode | null, buf: Float32Array<ArrayBuffer> | null;
    if (id === "me" || id === this.selfId) {
      if (this.muted) return 0;
      a = this.localAnalyser; buf = this.localBuffer;
    } else {
      const p = this.peers.get(id);
      a = p?.analyser ?? null; buf = p?.buffer ?? null;
    }
    if (!a || !buf) return 0;
    a.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.min(1, Math.sqrt(sum / buf.length) * 6);
  }

  /** Every line, with what the network is doing to it: for the stats panel and tests. */
  async stats(): Promise<PeerInfo[]> {
    const out: PeerInfo[] = [];
    const now = performance.now();
    for (const [id, p] of this.peers) {
      let bytesIn = 0, bytesOut = 0, lost = 0, received = 0;
      let jitter: number | null = null, rtt: number | null = null, path: PeerInfo["path"] = null;
      try {
        const report = await p.pc.getStats();
        let pairLocal: string | null = null;
        report.forEach((r) => {
          if (r.type === "inbound-rtp" && r.kind === "audio") {
            bytesIn += r.bytesReceived ?? 0;
            lost += Math.max(0, r.packetsLost ?? 0);
            received += r.packetsReceived ?? 0;
            if (typeof r.jitter === "number") jitter = Math.round(r.jitter * 1000);
          }
          if (r.type === "outbound-rtp" && r.kind === "audio") bytesOut += r.bytesSent ?? 0;
          if (r.type === "candidate-pair" && r.nominated && r.state === "succeeded") {
            if (typeof r.currentRoundTripTime === "number") rtt = Math.round(r.currentRoundTripTime * 1000);
            pairLocal = r.localCandidateId ?? null;
          }
        });
        if (pairLocal) {
          const local = report.get(pairLocal) as { candidateType?: string } | undefined;
          if (local?.candidateType) path = local.candidateType === "relay" ? "relay" : "direct";
        }
      } catch { /* closed */ }
      const kbpsIn = p.lastAt && now > p.lastAt ? Math.round(((bytesIn - p.lastBytes) * 8) / (now - p.lastAt)) : null;
      p.lastBytes = bytesIn;
      p.lastAt = now;
      out.push({
        id, pc: p.pcId, state: p.pc.connectionState, bytesIn, bytesOut,
        level: this.level(id), gain: p.gain, rtt, jitter,
        loss: received + lost > 0 ? Math.round((lost / (received + lost)) * 1000) / 10 : null,
        kbpsIn, path,
      });
    }
    return out;
  }

  connectionState(id: string): RTCPeerConnectionState | null {
    return this.peers.get(id)?.pc.connectionState ?? null;
  }

  private open(id: string): Peer {
    const peer = new Peer(
      id,
      this.selfId < id,
      this.stream!,
      (s) => this.sendTo(id, s),
      (p, stream) => this.attach(p, stream),
      () => this.onChange(),
    );
    this.peers.set(id, peer);
    return peer;
  }

  private attach(peer: Peer, stream: MediaStream) {
    if (!peer.audio) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "");
      this.box?.appendChild(el);
      peer.audio = el;
    }
    peer.audio.srcObject = stream;
    this.play(peer);
    // For the speaking ring only: the analyser listens, it does not play.
    peer.analyser = this.analyse(stream);
    peer.buffer = peer.analyser ? new Float32Array(peer.analyser.fftSize) : null;
    peer.audio.dataset.set = "";
    this.setGain(peer.id, peer.gain);
    this.onChange();
  }

  private play(peer: Peer) {
    void peer.audio?.play().catch((e: { name?: string }) => {
      if (e?.name === "NotAllowedError" && !this.blocked) { this.blocked = true; this.onChange(); }
    });
  }

  private analyse(stream: MediaStream): AnalyserNode | null {
    if (!this.ctx) return null;
    try {
      const src = this.ctx.createMediaStreamSource(stream);
      const a = this.ctx.createAnalyser();
      a.fftSize = 512;
      src.connect(a);
      return a;
    } catch {
      return null;
    }
  }
}
