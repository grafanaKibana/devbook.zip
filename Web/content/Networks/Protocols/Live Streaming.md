---
publish: true
created: 2026-07-16T14:12:14.050Z
modified: 2026-07-18T11:30:08.806Z
published: 2026-07-18T11:30:08.806Z
topic:
  - Networks
subtopic:
  - Protocols
summary: The ingest, transcoding, packaging, CDN, and playback path for live adaptive video.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Live streaming moves audio and video from a live encoder to many viewers while the program is still being produced. The working path is **ingest → transcode → package → origin → CDN → player**. Each stage trades latency against quality, reach, and failure isolation. A sports stream may accept 8–15 seconds to gain CDN scale; a live auction may need WebRTC-class latency and accept a more expensive distribution model.

# End-to-End Path

1. **Capture and ingest.** The encoder compresses camera and microphone input and sends a contribution stream to an ingest edge. RTMP is still common in encoder ecosystems; SRT and WebRTC/WHIP address loss recovery or lower-latency ingest.
2. **Transcode.** The service decodes the contribution feed and produces an aligned bitrate ladder, for example 1080p at 6 Mb/s, 720p at 3 Mb/s, and 480p at 1.2 Mb/s. Keyframes must align across renditions so a player can switch without corrupting the timeline.
3. **Package.** A packager writes short media segments or chunks plus manifests. HLS uses playlists; MPEG-DASH uses an MPD. CMAF fragmented MP4 can let both protocols share media objects when codec and profile choices overlap.
4. **Origin and CDN.** The origin exposes manifests and new media objects. CDN edges cache them and collapse simultaneous misses instead of sending every viewer to the packager.
5. **Player.** The player estimates throughput and buffer health, selects a rendition, downloads segments, decodes them, and moves up or down the ladder before playback stalls.

```text
camera -> encoder -> ingest -> transcoder -> packager -> origin -> CDN edge -> player
                          \-> archive/object storage -> replay/VOD manifest
```

# Latency Is a Budget

A six-second segment cannot usually deliver sub-second glass-to-glass latency: the encoder must fill it, the packager must publish it, the CDN must fetch it, and the player normally buffers more than one segment. Shorter segments or partial segments reduce wait time but increase request rate, manifest churn, cache pressure, and sensitivity to jitter.

Low-Latency HLS and low-latency DASH publish chunks before a full segment closes. WebRTC sends media continuously and handles congestion interactively, making it a better fit for calls, auctions, and remote control. It costs more per viewer because the delivery path cannot rely on ordinary immutable HTTP objects as effectively.

# Protocol Compatibility

| Protocol | Typical role | Browser/device boundary |
| --- | --- | --- |
| RTMP | Encoder-to-ingest contribution | Not a modern browser playback protocol; retain it where encoder support matters |
| SRT | Loss-tolerant contribution over uncontrolled networks | Common between encoders and media infrastructure, not native browser playback |
| HLS | Adaptive HTTP playback | Native on Apple platforms; other browsers commonly use Media Source Extensions through a JavaScript player |
| MPEG-DASH | Adaptive HTTP playback | Common through Media Source Extensions; Safari support depends on player and codec/container choices |
| WebRTC with WHIP/WHEP-style signaling | Interactive ingest or playback | Browser-native media stack with sub-second goals; harder CDN economics and session state |

Do not infer compatibility from the manifest name alone. Codec, profile, encryption, container, captions, and DRM support can rule out a device even when it understands HLS or DASH.

# Failure Boundaries

- Keep the last valid manifest available briefly when the packager restarts; a malformed or empty live manifest can drop every player at once.
- Measure capture timestamp to playback timestamp, not only CDN request latency.
- Preserve monotonic timestamps and aligned keyframes across failover encoders.
- Apply backpressure or drop frames deliberately; an unbounded ingest queue converts overload into ever-growing live latency.
- Separate the live path from replay finalization so a storage outage does not stop the broadcast.

# References

- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — defines HLS playlists, media segments, encryption tags, and client reload behavior.
- [W3C Media Source Extensions](https://www.w3.org/TR/media-source-2/) — specifies how web applications feed segmented media into browser playback buffers.
- [RFC 9725: WebRTC-HTTP Ingestion Protocol](https://www.rfc-editor.org/rfc/rfc9725) — defines WHIP signaling for WebRTC media contribution.
- [CMAF (ISO/IEC 23000-19)](https://www.iso.org/standard/79106.html) — the common fragmented-media format used to share encoded objects across adaptive streaming workflows.
- [ByteByteGo: Live streaming explained](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/live-streaming-explained.md) — source pipeline corrected here for stage order, protocol roles, and current compatibility.
