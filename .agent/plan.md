# Implementation Plan: Speech Coach Module Structure for Speaking Lessons

## 1. Architectural Alignment (Unilish Standards)

- **Scope**: Prepare backend module structure for real-time speaking lessons (not full implementation yet).
- **Persistence split**:
	- **MongoDB**: speaking session summary, assessment results, lesson-linked outcomes.
	- **Redis**: active call state, session recovery snapshot, transient buffers.
	- **Cloudflare R2**: archived audio blobs after session end.
	- **Pinecone**: optional semantic retrieval for speaking prompts/context expansion (no Neo4j).
- **Pattern**: Event-driven orchestration inside `services/speech-coach`, while preserving existing 3-layer backend contract:
	- Controller (socket/http adapter) -> Service (business orchestration) -> Repository/Provider (I/O).

---

## 2. Target Folder Structure (Enterprise-Clean)

```text
server/src/services/speech-coach/
├── index.ts
├── speech-coach.service.ts                 # Facade entrypoint for speaking flows
│
├── contracts/                              # Shared contracts/types for strict typing
│   ├── events.contract.ts                  # Socket event names + payload maps
│   ├── session.contract.ts                 # Session state DTOs
│   ├── assessment.contract.ts              # Pronunciation result DTOs
│   └── transcript.contract.ts              # Transcript/token timing DTOs
│
├── validations/                            # Zod schemas for every inbound event payload
│   ├── socket-event.schema.ts
│   ├── start-session.schema.ts
│   ├── audio-chunk.schema.ts
│   └── end-session.schema.ts
│
├── transports/                             # Real-time transport adapters only
│   ├── socket-session.gateway.ts           # Socket event handlers, no business logic
│   ├── webrtc-signal.gateway.ts            # Optional signaling if WebRTC path used
│   └── event-emitter.ts                    # Typed publish/emit helper
│
├── orchestrators/                          # Use-case orchestrators (workflow-level)
│   ├── start-speaking-session.orchestrator.ts
│   ├── process-audio-chunk.orchestrator.ts
│   ├── finalize-speaking-session.orchestrator.ts
│   └── recover-speaking-session.orchestrator.ts
│
├── engines/                                # AI runtime adapters (provider-specific)
│   ├── conversation/
│   │   ├── openai-realtime.engine.ts       # Track 1 conversation stream
│   │   └── conversation-fallback.engine.ts # Downgrade path STT->LLM->TTS
│   └── assessment/
│       ├── azure-pronunciation.engine.ts   # Track 2 scoring stream
│       └── assessment-normalizer.ts        # Normalize provider output
│
├── sessions/                               # Session state management (Redis focused)
│   ├── speaking-session.manager.ts
│   ├── speaking-session.cache.repo.ts
│   └── session-recovery.policy.ts
│
├── prompts/                                # Prompt/persona composition
│   ├── prompt-builder.service.ts
│   ├── prompt-template.registry.ts
│   └── personas/
│       ├── airport-staff.persona.ts
│       ├── ielts-examiner.persona.ts
│       └── business-client.persona.ts
│
├── processing/                             # Audio processing and stream utilities
│   ├── audio-chunk.assembler.ts
│   ├── silence-detector.ts
│   ├── latency-tracker.ts
│   └── stream-backpressure.guard.ts
│
├── persistence/                            # Persisted result writing (Mongo/R2)
│   ├── speaking-result.writer.ts
│   ├── pronunciation-result.mapper.ts
│   └── audio-archive.writer.ts
│
├── observability/                          # Logs, metrics, tracing tags
│   ├── speech-metrics.service.ts
│   ├── cost-telemetry.service.ts
│   └── structured-log.fields.ts
│
└── safeguards/                             # Reliability, limits, operational safety
		├── circuit-breaker.policy.ts
		├── timeout.policy.ts
		├── retry.policy.ts
		└── quota.guard.ts
```

---

## 3. Why This Structure Works

- **Strict separation of concerns**: transport, orchestration, provider engines, persistence, and safeguards are isolated.
- **Typed-first integration**: all payloads/events are centralized under `contracts/` and `validations/`.
- **Production readiness**: reliability controls (`circuit-breaker`, timeout, backpressure, retry) are first-class folders.
- **Cost and latency accountability**: observability modules are explicit from day 1.

---

## 4. Event Contract Blueprint (Speaking Runtime)

### Client -> Server
- `speaking.session.start`
- `speaking.audio.chunk`
- `speaking.session.end`
- `speaking.session.recover`

### Server -> Client
- `speaking.session.started`
- `speaking.ai.response.chunk`
- `speaking.assessment.partial`
- `speaking.assessment.final`
- `speaking.session.error`
- `speaking.session.ended`

### Core payload rules
- Every event payload must pass Zod schema before orchestrator execution.
- Correlation fields are mandatory: `sessionId`, `userId`, `lessonId`, `traceId`, `timestamp`.
- Version field required for forward compatibility: `contractVersion`.

---

## 5. Implementation Phases (Execution Roadmap)

### Phase 0 — Foundation (Structure + Contracts)
1. Create the full folder skeleton.
2. Add strict contracts and Zod schemas.
3. Add typed event map and gateway stubs.
4. Add `speech-coach.service.ts` facade with empty orchestration calls.

**Exit criteria**:
- All files compile with strict TypeScript.
- No `any`.
- Event payload validation gate exists for all inbound events.

### Phase 1 — Session Runtime (Redis + Lifecycle)
1. Implement session manager + cache repo for active calls.
2. Implement start/end/recover orchestrators.
3. Add silence timeout and idle disconnect policy.

**Exit criteria**:
- Session lifecycle works end-to-end with reconnect support.
- Circuit-breaker for silence > configured threshold is active.

### Phase 2 — Dual-Track Engines
1. Integrate OpenAI Realtime engine (conversation).
2. Integrate Azure pronunciation engine (assessment).
3. Normalize results and emit partial/final feedback events.

**Exit criteria**:
- Conversation stream and assessment stream run in parallel.
- Partial assessment can be emitted without blocking conversation.

### Phase 3 — Persistence + Archive
1. Persist speaking outcomes to Mongo through dedicated writer.
2. Archive finalized audio to R2.
3. Link session outcomes with lesson/user progress entities.

**Exit criteria**:
- Every completed session has durable result record.
- Audio archival job succeeds with retry policy.

### Phase 4 — Observability + Hardening
1. Add structured logs and latency/cost metrics.
2. Add timeout/retry/backpressure guards.
3. Add fallback engine path when Realtime API fails.

**Exit criteria**:
- Latency SLA dashboard fields available.
- Graceful degradation path tested.

---

## 6. Enterprise Guardrails (Must-Have Rules)

- `console.log` forbidden; use shared logger.
- No business logic inside gateways.
- Zod validation required before any side effects.
- Provider SDK response must be normalized before emitting/storing.
- Keep speaking module internal APIs stable via contracts folder; avoid ad-hoc payload changes.
- Keep file names `kebab-case.ts` and class names `PascalCase`.

---

## 7. Minimal Initial Deliverables (Week 1)

1. Folder skeleton exactly as defined.
2. Event contracts + zod schemas for 4 inbound events.
3. Session start/end/recover orchestrator stubs.
4. Redis session manager skeleton.
5. `speech-coach.service.ts` facade + index export.

This gives a clean, scalable base for implementing speaking lessons without rework in later phases.

