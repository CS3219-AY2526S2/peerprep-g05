process.env["OPENROUTER_API_KEY"] ??= "test-openrouter-key";
process.env["OPENROUTER_MODELS"] ??= "model-a,model-b";
process.env["REDIS_URL"] ??= "redis://localhost:6379";
process.env["USER_SERVICE_JWKS_URL"] ??=
  "http://localhost:3001/api/v1/auth/jwks";
process.env["REQUEST_TIMEOUT_MS"] ??= "30000";
process.env["MAX_REQUEST_BODY_SIZE"] ??= "1mb";
process.env["AUTH_COOKIE_NAME"] ??= "peerprep_access_token";
process.env["JWKS_CACHE_TTL_MS"] ??= "300000";
process.env["AI_DAILY_TOTAL_BUDGET"] ??= "100";
process.env["AI_DAILY_CHAT_BUDGET"] ??= "50";
process.env["AI_DAILY_PSEUDOCODE_BUDGET"] ??= "50";
