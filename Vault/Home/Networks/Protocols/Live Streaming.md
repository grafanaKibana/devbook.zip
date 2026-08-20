---
topic:
  - Networks
subtopic:
  - Protocols
summary: "The ingest, transcoding, packaging, CDN, and playback path for live adaptive video."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

Live streaming distributes media while it is still being captured. The usual path is **ingest → transcode → package → origin → CDN → player**. Latency accumulates at every boundary, especially where a stage waits for a keyframe, segment, network response, or playback buffer.

HTTP adaptive streaming scales well because manifests and media objects can pass through ordinary CDNs. Interactive broadcasts need a shorter feedback loop. WebRTC can reach sub-second targets, but it replaces cache-friendly objects with stateful media sessions and a different cost model.

# End-to-End Path

1. **Capture and ingest.** The encoder compresses source media and sends a contribution feed to an ingest edge. RTMP remains common in encoder tooling. SRT adds recovery for unreliable contribution paths. WHIP standardizes the HTTP signaling used to establish a WebRTC ingest session. WebRTC carries the media.
2. **Transcode.** The service produces a bitrate ladder, perhaps 1080p at 6 Mb/s, 720p at 3 Mb/s, and 480p at 1.2 Mb/s. Renditions need aligned timelines and keyframes so a player can switch cleanly.
3. **Package.** The packager writes manifests and addressable media units. HLS uses playlists. MPEG-DASH uses an MPD. Compatible codec, encryption, and profile choices can let both reference the same CMAF fragmented-MP4 objects.
4. **Origin and CDN.** The origin exposes the current manifest and media. CDN edges cache immutable objects and can collapse simultaneous misses when the provider supports and enables request coalescing, keeping viewer fan-out away from the packager.
5. **Player.** The player estimates available throughput against buffer health, chooses a rendition, and changes quality before the buffer empties.

```text
camera -> encoder -> ingest -> transcoder -> packager -> origin -> CDN edge -> player
                          \-> archive/object storage -> replay/VOD manifest
```

# Latency Is a Budget

A player cannot achieve sub-second glass-to-glass latency while waiting for whole multi-second segments. Encoding, publication, CDN retrieval, and the playback buffer each consume part of the budget. Short segments reduce one delay and create others: more requests, more manifest updates, smaller cache objects, and less room to absorb jitter.

Low-Latency HLS and low-latency DASH expose partial media before a full segment closes. They keep HTTP distribution while tightening encoder, packager, CDN, and player behavior. WebRTC sends media continuously and adapts to congestion on an interactive timescale. Calls, auctions, and remote control often need that path despite its stateful per-viewer cost.

# Protocol Compatibility

| Protocol | Typical role | Browser/device boundary |
| --- | --- | --- |
| RTMP | Encoder-to-ingest contribution | Not a modern browser playback protocol. Retain it where encoder support matters |
| SRT | Loss-tolerant contribution over uncontrolled networks | Common between encoders and media infrastructure, not native browser playback |
| HLS | Adaptive HTTP playback | Native on Apple platforms. Other browsers commonly use Media Source Extensions through a JavaScript player |
| MPEG-DASH | Adaptive HTTP playback | Common through Media Source Extensions. Safari support depends on player and codec/container choices |
| WebRTC with HTTP signaling such as WHIP for ingest | Interactive ingest or playback | Browser-native media stack with sub-second goals. Harder CDN economics and per-session state |

Manifest support does not prove playback support. The device must also accept the selected codec and profile, container, encryption scheme, captions, and DRM system.

# Failure Boundaries

- Keep the last valid manifest available briefly during a packager restart. Publishing an empty or malformed live manifest can disconnect the whole audience.
- Measure capture-to-playback time. CDN request latency covers only one stage.
- Failover encoders must preserve monotonic timestamps and aligned keyframes.
- Bound ingest queues. Under overload, dropping frames or shedding a rendition is safer than allowing live latency to grow without limit.
- Replay finalization should fail independently from the live path so a storage outage does not stop the broadcast.

# References

- [HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216)
- [Media Source Extensions](https://www.w3.org/TR/media-source-2/)
- [WebRTC-HTTP Ingestion Protocol](https://www.rfc-editor.org/rfc/rfc9725)
- [Common Media Application Format](https://www.iso.org/standard/85623.html)
