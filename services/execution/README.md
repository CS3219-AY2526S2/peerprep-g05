# Execution Microservice

Executes Python code against question-style test cases and supports pseudocode-to-python conversion via the AI microservice.

## Endpoints

### POST /api/v1/execution/execute-python-code

Request body:

```json
{
  "code": "print(input())",
  "test_cases": [
    { "input": "hello", "expected_output": "hello", "is_public": true }
  ],
  "expected_test_case_answers": ["hello"]
}
```

Notes:
- `test_cases` follows the question-service shape.
- `expected_test_case_answers` is optional compatibility input and is used by index when `test_cases[i].expected_output` is omitted.

Response shape:

```json
{
  "passedTestCases": [],
  "failedTestCases": [],
  "errorType": "syntax",
  "errorsPresent": [
    {
      "type": "SyntaxError",
      "message": "invalid syntax",
      "line": 2,
      "column": 12
    }
  ]
}
```

### POST /api/v1/execution/convert-to-python-and-execute

- Receives the same payload.
- Sends only `code` to AI `/api/v1/ai/pseudocode-to-python` as `pseudocode`.
- Executes returned `pythonCode` with original test-case payload.
- Returns the same response shape as `/execute-python-code`.

## Authentication

Both endpoints require authentication using bearer token or auth cookie. The service verifies tokens using user-service JWKS.

## Environment Variables

- `PORT`
- `USER_SERVICE_JWKS_URL`
- `AI_SERVICE_BASE_URL`
- `PYTHON_EXEC_TIMEOUT_MS`
- `REQUEST_TIMEOUT_MS`
- `MAX_REQUEST_BODY_SIZE`
- `AUTH_COOKIE_NAME`
- `JWKS_CACHE_TTL_MS`
- `MAX_TEST_CASES`

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```
