"use client";

/**
 * Cash Town's voice: everybody in voice connected to everybody else in it,
 * peer to peer, and each voice as loud as its owner is close.
 *
 * Peer to peer (a mesh) because the prototype is two or three admins and a
 * mesh costs nothing: the audio goes straight between the browsers, and only
 * the few messages that introduce them travel through the room channel.
 * Past about six people a server that forwards audio (the Cloudflare SFU in
 * the fc-cash-town skill) takes over; the proximity rules above it stay.
 *
 * Distance is applied on the listener's side, as the volume of each voice's
 * own <audio> element rather than through Web Audio. The element is what
 * Chrome's echo cancellation listens to, so laptop speakers do not feed the
 * other person's voice back into the microphone. iOS ignores volume, so out of
 * range is also `muted`, which iOS does honour.
 *
 * The introductions follow WebRTC's "perfect negotiation": both sides may
 * start at once, and the polite one gives way. Every connection also carries
 * a name of its own (`pc`), because the first prototype taught that a
 * connection can die on one side only: a tab sleeps, the other side gives up
 * and starts a new one, and the sleeper wakes holding the old one. Messages
 * now say which connection they belong to. An offer from a new one means the
 * other side started over, so we do too; anything addressed to a connection
 * that no longer exists is dropped.
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
}

/**
 * Public STUN only, for now: enough for most home connections. Some mobile
 * networks need a TURN relay, which needs credentials minted by a server;
 * when a connection fails, the town says so rather than going quiet.
 */
const ICE: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

/** How long a connection may be down before it is replaced, not repaired. */
const GIVE_UP_MS = 15_000;

const newId = () => Math.random().toString(36).slice(2, 10);

class Peer {
  readonly pc: RTCPeerConnection;
  readonly pcId = newId();
  /** The other side's connection this one is paired with, once known. */
  remotePc: string | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  audio: HTMLAudioElement | null = null;
  analyser: AnalyserNode | null = null;
  gain = 0;
  /** Since when it has not been connected; null while it is. */
  badSince: number | null = Date.now();

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
        if (this.pc.localDescription) this.send({ pc: this.pcId, description: this.pc.localDescription.toJSON() });
      } catch { /* the other side's offer wins; nothing to undo */ } finally {
        this.makingOffer = false;
      }
    };
    this.pc.onicecandidate = ({ candidate }) =>
      this.send({ pc: this.pcId, candidate: candidate ? candidate.toJSON() : null });
    this.pc.ontrack = ({ streams }) => { if (streams[0]) this.onRemote(this, streams[0]); };
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === "connected") this.badSince = null;
      else if (this.badSince === null) this.badSince = Date.now();
      // A network change (Wi-Fi to 4G) can often be recovered by gathering again.
      if (s === "failed") this.pc.restartIce();
      this.onState();
    };
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
        if (this.pc.localDescription) this.send({ pc: this.pcId, description: this.pc.localDescription.toJSON() });
      }
    } else {
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
  private peers = new Map<string, Peer>();
  private box: HTMLDivElement | null = null;
  private muted = false;

  constructor(
    private readonly selfId: string,
    private readonly sendTo: (to: string, s: Signal) => void,
    private readonly onChange: () => void,
  ) {}

  get active() { return this.stream !== null; }
  get isMuted() { return this.muted; }

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
    this.box = document.createElement("div");
    this.box.hidden = true;
    this.box.dataset.cashTownAudio = "";
    document.body.appendChild(this.box);
    this.muted = false;
    this.onChange();
  }

  stop() {
    for (const p of this.peers.values()) p.close();
    this.peers.clear();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.localAnalyser = null;
    this.box?.remove();
    this.box = null;
    this.onChange();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
    this.onChange();
  }

  /** Make the set of connections match the people who are in voice now. */
  sync(inVoice: string[]) {
    if (!this.stream) return;
    const want = new Set(inVoice.filter((id) => id !== this.selfId));
    for (const id of want) if (!this.peers.has(id)) this.open(id);
    for (const [id, p] of this.peers) {
      if (!want.has(id)) { p.close(); this.peers.delete(id); }
    }
    this.onChange();
  }

  /**
   * Replace any connection that has been down too long. Repairing in place
   * (restartIce) is tried first, when the connection says it failed; this is
   * for when that did not work, or when the introductions never got through.
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
      // From a connection we are not paired with. An offer means they started
      // over, so start over too; anything else is left over from the old one.
      if (!isOffer) return;
      peer.close();
      this.peers.delete(from);
      peer = undefined;
    }
    peer ??= this.open(from);
    peer.remotePc ??= s.pc;
    try {
      await peer.signal(s);
    } catch { /* a stale candidate or offer; the next one will do */ }
  }

  /** Volume of one voice, from 0 (out of range) to 1 (next to you). */
  setGain(id: string, gain: number) {
    const p = this.peers.get(id);
    if (!p) return;
    p.gain = gain;
    if (p.audio) {
      p.audio.volume = Math.max(0, Math.min(1, gain));
      p.audio.muted = gain < 0.02;
    }
  }

  /** How loud somebody is speaking right now, 0–1: "me" for the microphone. */
  level(id: string): number {
    const a = id === "me" || id === this.selfId ? this.localAnalyser : this.peers.get(id)?.analyser;
    if (!a || (id === "me" && this.muted)) return 0;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.min(1, Math.sqrt(sum / buf.length) * 6);
  }

  /** Who we are connected to, for the people list and for testing. */
  async stats(): Promise<PeerInfo[]> {
    const out: PeerInfo[] = [];
    for (const [id, p] of this.peers) {
      let bytesIn = 0, bytesOut = 0;
      try {
        (await p.pc.getStats()).forEach((r) => {
          if (r.type === "inbound-rtp" && r.kind === "audio") bytesIn += r.bytesReceived ?? 0;
          if (r.type === "outbound-rtp" && r.kind === "audio") bytesOut += r.bytesSent ?? 0;
        });
      } catch { /* closed */ }
      out.push({ id, pc: p.pcId, state: p.pc.connectionState, bytesIn, bytesOut, level: this.level(id), gain: p.gain });
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
      el.volume = 0;
      el.muted = true;
      this.box?.appendChild(el);
      peer.audio = el;
    }
    peer.audio.srcObject = stream;
    void peer.audio.play().catch(() => {});
    // For the speaking ring only: the analyser listens, it does not play.
    peer.analyser = this.analyse(stream);
    this.setGain(peer.id, peer.gain);
    this.onChange();
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
