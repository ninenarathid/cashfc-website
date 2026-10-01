# Proximity voice: walk close, talk

The Gather idea: you hear people near you, louder the closer they are, and
private areas where everyone inside hears each other. In the browser this is
WebRTC for the audio and the Web Audio API for the distance effect.
Re-check the prices (costs.md) before choosing.

## Contents
1. Two ways to carry the audio
2. Deciding who hears whom
3. Distance, done with the Web Audio API
4. Browsers and phones
5. Safety and privacy defaults
6. A suggested path

## 1. Two ways to carry the audio

**Mesh, peer to peer.** Each person connects directly to each person near
them.
- **Signalling** (offers, answers, ICE candidates) goes through the zone's
  Durable Object as `{t: "rtc"}` messages.
- **STUN** is free. **TURN** relays the 10–20% of connections behind strict
  NATs. Cloudflare Realtime TURN shares the 1,000 GB free a month with the
  SFU.
- **Cost:** almost nothing.
- **Limit:** each phone uploads one stream per listener. Fine for groups of
  up to about 6; beyond that the phone's uplink and battery suffer.
- **The proximity design helps:** you connect only to the few people near
  you.

**SFU (a server that forwards).** Each person uploads once, and the server
forwards it to whoever should hear it.
- **Cloudflare Realtime SFU** bills egress only: 1,000 GB free a month
  (shared with TURN), then $0.05 per GB. It scales well, and the site is
  moving to Cloudflare.
- **LiveKit Cloud** has the most complete SDKs, rooms and spatial examples.
  - Free Build plan: 5,000 WebRTC minutes, 100 concurrent, 50 GB.
  - Ship plan: $50 a month (150,000 minutes, 250 GB).
  - A town in daily use would outgrow the free minutes quickly (see
    `town-cost.mjs`).
- **Self-hosted LiveKit or mediasoup:** no fees, but a server to run and
  patch.

The rule of thumb: start with **mesh for a small spike**, and choose the
**Cloudflare SFU** when groups grow or phones complain.

## 2. Deciding who hears whom

- **Radius:** hear within R tiles (for example 5). Fade between R and 1.4×R.
- **Hysteresis:** connect at R and disconnect only beyond 1.4×R, so
  connections don't flap at the edge.
- **Private areas:** zones from the map (a meeting room, a home). Inside
  one, you hear exactly the people in the same area, at full volume, and
  nobody outside.
- **Cap the group:** if more than about 6 are in range on mesh, keep the
  nearest 6.
- **The server only signals.** Who is near whom is decided from the
  positions the Durable Object already knows, and both sides must agree
  before a connection opens.

## 3. Distance, done with the Web Audio API

```ts
const ctx = new AudioContext();                         // create or resume on a user gesture (iOS)
function attach(stream: MediaStream) {
  const src = ctx.createMediaStreamSource(stream);
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();                 // optional: left/right by x offset
  src.connect(gain).connect(pan).connect(ctx.destination);
  return (dist: number, dx: number) => {
    const g = dist <= R ? 1 : dist >= R * 1.4 ? 0 : 1 - (dist - R) / (R * 0.4);
    gain.gain.setTargetAtTime(g, ctx.currentTime, 0.1); // smooth, no clicks
    pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, dx / R)) * 0.6, ctx.currentTime, 0.1);
  };
}
```

**Chrome quirk:** a remote WebRTC stream may need to be attached to a muted
`<audio>` element as well, or the Web Audio path stays silent. Test on
Chrome, Safari iOS and Android.

## 4. Browsers and phones

- **Microphone permission** needs HTTPS and a user gesture. Ask only when the
  person presses "join voice", never on entering the town.
- **iOS Safari:**
  - The AudioContext starts suspended; resume it on a tap.
  - Audio stops when the tab is backgrounded. Say so in the UI.
- **Echo:** enable `echoCancellation`, `noiseSuppression` and
  `autoGainControl` in `getUserMedia`. Suggest headphones.
- **Bandwidth:** Opus at about 32 kbps is enough for speech. Use mono, and
  turn on DTX (discontinuous transmission) so silence costs nothing.
- **Reconnects:** handle a network change (Wi-Fi to 4G) with an ICE restart.

## 5. Safety and privacy defaults

- **The microphone starts off.** Joining voice is a choice, every session.
  Push-to-talk is an option; open mic is another.
- **Always visible:** who is speaking (a ring on their avatar), and whether
  your own mic is live.
- **Mute anyone for yourself.** Blocking hides their avatar, chat and voice
  both ways.
- **Report to the admins,** with a short text. There is no recording,
  ever. Say so in the rules.
- **Only a verified character can talk** (v85). Guests, if allowed in, can
  listen and type.
- **Private areas really are private.** The SFU or mesh only connects the
  people inside.

## 6. A suggested path

1. **Spike:** two browsers in one zone, mesh, with distance gain. Measure
   delay, echo, and phone battery over 15 minutes.
2. **Phase 1 for voice:** mesh with up to 6 in a group, private areas,
   mute, block and report.
3. **When groups grow:** move to the Cloudflare Realtime SFU behind the
   same proximity logic, so only the transport changes.
