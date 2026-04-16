# AI Usage Log

# Date/Time:
2026-02-10 00:40

# Tool:
ChatGPT

# Prompt/Command:
Designed initial matchmaking architecture using RabbitMQ + Redis + PostgreSQL. Discussed match lifecycle, pairing logic, and system design (topic + difficulty queueing, worker-based matching).

# Output Summary:
Defined event-driven matchmaking architecture:
- match.enter events published to RabbitMQ
- Redis queues partitioned by topic+difficulty
- Worker consumes queue and pairs users
- PostgreSQL stores match state (WAITING → PROPOSED → CONFIRMED/CANCELLED)
- Introduced distributed locking and idempotency strategy

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
This became the baseline system design for the matchmaking engine.

# Date/Time:
2026-02-13 01:05

# Tool:
ChatGPT

# Prompt/Command:
Implemented acceptMatch and declineMatch endpoints with Redis locking, PostgreSQL transactional updates, and match state validation.

# Output Summary:
Implemented full match resolution lifecycle:
- acceptMatch:
  - resolves REDIRECTED → PROPOSED match
  - tracks accepted_by_a / accepted_by_b
  - transitions to CONFIRMED when both accept
- declineMatch:
  - cancels match if in PROPOSED state
  - logs MATCH_DECLINED event
  - publishes match.requeue for remaining user
- introduced strict participant validation and expiry checks

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
Ensured correctness of match lifecycle transitions and participant integrity.

# Date/Time:
2026-03-02 01:30

# Tool:
ChatGPT

# Prompt/Command:
Designed timeout_worker.js handling proposal expiry, waiting timeout, and requeue logic for unmatched or partially accepted users.

# Output Summary:
Implemented timeout system:
- PROPOSED expiry handled via periodic DB scan
- MATCH_TIMED_OUT event emitted
- partial acceptance triggers requeue of single user
- WAITING timeout triggers match.leave event
- separation of proposal timeout vs queue timeout
- ensured safe transactional updates and event publishing

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
Timeout worker ensures system liveness and prevents stale matches.

# Date/Time:
2026-03-02 01:50

# Tool:
ChatGPT

# Prompt/Command:
Designed WebSocket gateway architecture for real-time matchmaking updates without JWT authentication dependency.

# Output Summary:
Defined WebSocket system:
- Redis maps user_id → socket_id
- RabbitMQ notification consumer pushes events
- real-time updates for match.proposed / confirmed / cancelled
- simplified auth assumption (no JWT yet)
- separation of gateway from matchmaking core

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
Prepared system for real-time UI integration layer.

# Date/Time:
2026-03-28 00:45  
# Tool:
ChatGPT  
# Prompt/Command:
Debugging and redesign of a matchmaking microservice using Redis queues, PostgreSQL transactions, RabbitMQ events, and worker-based architecture. The system involves handling match enter, match leave, match requeue, and timeout-based expiration of proposed matches. User provided worker implementation and asked why requeue loops occur and why matching is not happening correctly, especially for `ANY` difficulty cases.  
# Output Summary:
Identified flaws in queue scanning logic, missing atomicity in Redis operations, and incorrect handling of difficulty compatibility leading to starvation and repeated requeue cycles.  
# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected
# Author Notes:
User system relies on distributed workers with Redis + Postgres coordination; issues were primarily caused by non-atomic queue scanning and incorrect matching termination conditions.

# Date/Time:
2026-03-29 01:15  
# Tool:
ChatGPT  
# Prompt/Command:
Docker Compose orchestration issue: user wants matchmaking service, workers, and websocket service to start automatically without manual execution. Provided multi-service docker-compose setup and asked how to auto-start all components properly.  
# Output Summary:
Explained dependency management using `depends_on` with healthchecks, ensuring workers and ws-service start only after PostgreSQL, Redis, RabbitMQ, and matchmaking server are healthy.  
# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Proper orchestration requires service readiness checks, not just container startup order.

# Date/Time:
2026-03-31 01:00

# Tool:
ChatGPT

# Prompt/Command:
User reported CORS errors between frontend (localhost:5173) and gateway (localhost:4000) despite having CORS middleware configured in Express + http-proxy-middleware setup.

# Output Summary:
Diagnosed that CORS failure was caused by missing handling of preflight OPTIONS requests and proxy interaction. Explained that:
- OPTIONS requests were likely not properly handled before hitting proxy
- `cors()` middleware alone was insufficient in gateway + microservice proxy architecture
- Suggested fixes:
  - Add `app.options("*", cors())`
  - Ensure CORS runs before proxy middleware
  - Verify backend services are not stripping headers
  - Confirm Access-Control-Allow-Origin is present on preflight and actual responses

# Action Taken:
- [x] Modified
- [ ] Accepted as-is
- [ ] Rejected

# Author Notes:
Root issue was not configuration omission but incorrect preflight handling in a proxy-based gateway architecture.

# Date/Time:
2026-04-03 01:15

# Tool:
ChatGPT

# Prompt/Command:
User provided WebSocket chat server logs showing rejection due to `socket.roomId (undefined)` mismatch during CHAT_MESSAGE handling, despite frontend sending CHAT_JOIN on connection.

# Output Summary:
Identified root cause as protocol mismatch:
- Frontend sends `CHAT_JOIN`
- Backend expects `JOIN_ROOM` (or equivalent join handler not triggered)
- Result: `socket.roomId` never set → message validation fails

Explained fix options:
- Align event names between frontend and backend
- Ensure join handler sets `socket.roomId`
- Add debugging logs for payload.type
- Recommended explicit JOIN_ROOM or consistent CHAT_JOIN protocol

# Action Taken:
- [x] Modified
- [ ] Accepted as-is
- [ ] Rejected

# Author Notes:
Issue was purely event contract mismatch, not WebSocket infrastructure failure.

# Date/Time:
2026-04-09 01:30

# Tool:
ChatGPT

# Prompt/Command:
User requested a full rewrite of a WebSocket chat server handling authentication, room management, Redis-backed message history, and broadcast logic.

# Output Summary:
Refactored WebSocket server into a cleaner production-ready structure:
- Unified room state management (socket.roomId as source of truth)
- Simplified join/leave logic
- Safer message parsing
- Clear separation of concerns (auth, helpers, handlers, server init)
- Improved broadcast mechanism
- Reduced redundant validation checks
- Standardized CHAT_JOIN and CHAT_MESSAGE flow

# Action Taken:
- [x] Modified
- [ ] Accepted as-is
- [ ] Rejected

# Author Notes:
Rewrite improved maintainability and reduced state inconsistency risks, making system closer to production-grade WebSocket architecture.