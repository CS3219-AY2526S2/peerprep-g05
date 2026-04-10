process.env["USER_SERVICE_JWKS_URL"] ??=
  "http://localhost:3001/api/v1/auth/jwks";
process.env["AI_SERVICE_BASE_URL"] ??= "http://localhost:3004";
process.env["PYTHON_EXEC_TIMEOUT_MS"] ??= "5000";
process.env["REQUEST_TIMEOUT_MS"] ??= "30000";
process.env["MAX_REQUEST_BODY_SIZE"] ??= "1mb";
process.env["AUTH_COOKIE_NAME"] ??= "peerprep_access_token";
process.env["JWKS_CACHE_TTL_MS"] ??= "300000";
process.env["MAX_TEST_CASES"] ??= "50";
