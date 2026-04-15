# AI Usage Log

# Date/Time:
2026-02-11 21:10
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
Master admin could edit and delete questions but could not add new questions. Fix the add flow, then review RBAC coverage across CRUD for the question service to ensure consistency.

# Output Summary:
Updated question create flow so authenticated admin and master admin requests are correctly forwarded, added/standardized RBAC checks for privileged question mutations, and aligned frontend request headers for create/update/delete and lock operations.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Adjusted a few small integration details after applying the changes, then re-tested question management flows (create/read/update/delete) with admin-level accounts to confirm RBAC behavior is consistent.

----------

# Date/Time:
2026-02-28 16:05
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
Question editing currently shows intermittent internal server errors, and lock behavior is inconsistent when multiple admins open the same editor page.

Fix the edit flow for /services/question by hardening lock acquisition and enforcing lock ownership on updates so only the current lock holder can save.

# Output Summary:
Updated lock acquisition in /services/question/api/controllers/lockController.js to handle duplicate concurrent lock requests safely, aligned update handling to require a valid lock holder identity, and verified lock conflict behavior for multi-admin editing.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Tweaked a couple of response messages to match our frontend handling, then re-tested edit/save/lock flows across two admin accounts before committing.

----------

# Date/Time:
2026-02-28 16:28
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
Reset question IDs to start from 1 and increase seeded question volume for /services/question.

Use the same source pattern and ensure the database has 200 total questions with test cases linked correctly.

# Output Summary:
Updated /services/question/scripts/seed.js target sizing, reset questions/test_cases with identity restart, and re-seeded the database to 200 questions with complete test case coverage.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Did a quick DB verification on counts and ID range, plus a spot-check on test case linkage, then finalized the changes.

----------

# Date/Time:
2026-03-01 00:11
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
I updated the Question Service response payloads for list and detail endpoints and made small validation tweaks.

Update /services/question/tests so integration and unit tests remain aligned with the latest payload shape and validation behavior.

# Output Summary:
Updated /services/question/tests for payload assertions, validation cases, and related controller mocks.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Applied minor assertion and fixture adjustments to match our final response format, then reran the question test suite before committing.

----------

# Date/Time:
2026-03-01 01:42
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
Question editing and lock handling needed a final check for concurrent admin edits.

Refine lock-related tests and endpoint checks under /services/question/tests so ownership, conflict, and release scenarios are covered clearly.

# Output Summary:
Expanded lock-focused tests for acquire/update/release flows and strengthened conflict-case coverage for concurrent editors.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Made small wording and assertion updates for consistency with our API responses, then verified lock behavior with endpoint tests before committing.

----------

# Date/Time:
2026-03-01 14:30
# Tool:
GitHub Copilot
# Prompt/Command:
This project called PeerPrep, which is something similar to Leetcode but with collaborative features. It is comprised of microservices, namely: User Service, Matching Service, Question Service, and Collaboration Service. I am implementing the user service microservice and below is my the architecture for the user microservice:

services/user/
	/api
		/controllers
		/routes
		/middleware
	/domain
		/models -> for the User model
		/services
	/infrastructure
		/database -> for establishing the Postgres connection
		/security -> for JWT and bcrypt

In the future, I may need your help to implement functions, classes, and unit tests so be aware of the above architecture.

# Output Summary:
No output, just an acknowledgement.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Nil

----------

# Date/Time:
2026-03-01 15:08
# Tool:
GitHub Copilot
# Prompt/Command:
Attached are the files jwt.js and password.js under /infrastructure/security. Check if they have been written correctly and add some console logs to help me see the output as I verify if they work correctly. I have also decided to pick 4 for the bcrypt SALT_ROUNDS. Is this safe or should I increase it?

# Output Summary:
Corrected import paths, refactored my functions to be cleaner, generated the console logs and suggested increasing SALT_ROUNDS for bcrypt to 10-12.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Changed some naming conventions to make them more understandable and decided to go with 10 SALT_ROUNDS after verifying with online readings.

----------

# Date/Time:
2026-03-01 15:17
# Tool:
GitHub Copilot
# Prompt/Command:
I am now implementing the User model, where it needs to have the following attributes:
- ID (should be the primary key)
- email (used for signing up/in)
- username
- role (user or admin, which has RLS implications)
- display name (can be null)
- date of creation
- date the user profile was last updated

Also include a function to convert the user information to JSON.

Once done, in the existing authService.js and userService.js, replace the existing template attributes or parameters with the actual user attributes as you have implemented as per the model.

# Output Summary:
User Class in User.js, changes to authService.js and userService.js to make use of the new User class. Also suggested an isActive field to avoid conflicts on deletion due to foreign keys.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Read up the logic on having an isActive field and agreed on its usefulness. Removed unnecessary additions beyond basic user modelling and authentication.

----------

# Date/Time:
2026-03-01 16:02
# Tool:
GitHub Copilot
# Prompt/Command:
With reference to the attributes of the User class from User.js, check through and add anything missing from this set of SQL statements for the initial command to be run when I run npm run migrate. Once done, look through userRepository.js and see if I have all the necessary functions. Importantly, I need functions to create and delete users, update user profiles, and find users by their respective attributes.

# Output Summary:
Implemented missing find functions and suggested avoiding hard delete in the default flow by using isActive for soft-delete.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Read up common practices and verified that soft delete is widely adopted to avoid conflicts, while still keeping hard delete as an option.

----------

# Date/Time:
2026-03-01 16:30
# Tool:
GitHub Copilot
# Prompt/Command:
Now I am implementing the controllers for admin, user, and authentication.

See if my implementation is correct and add brief comments to make the functions more understandable as there may be collaboration with teammates.

# Output Summary:
Fixed minor mistakes in the functions and added comments showing the HTTP endpoints for each function.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Verified the fixes and accepted the comments after manual testing.

----------

# Date/Time:
2026-03-01 18:35
# Tool:
GitHub Copilot
# Prompt/Command:
For the middleware, I need authentication, authorization, and validation.

Authentication should verify a valid JWT and also handle inactive users (isActive = false). Authorization should verify authenticated users and enforce role checks for privileged operations (for example, admin-only edits). Validation currently has registration rules in validate.js; comment if more rules are needed, otherwise implement similar rules for login, profile updates, and other endpoints that need validation.

# Output Summary:
Corrected mistakes, added comments, and proposed an additional less-strict authentication variant.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Agreed with the fixes and comments but removed the extra authentication variant as it was unnecessary.

----------

# Date/Time:
2026-03-10 15:47
# Tool:
GitHub Copilot
# Prompt/Command:
The attached content is for the OTP migration under user service. Verify if the parameters are valid according to the implementation in the repo and format it to improve readability.

# Output Summary:
Reformatted the migration and added the created_at field that was missing.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Agreed with the formatting and adding created_at.

----------

# Date/Time:
2026-03-10 16:24
# Tool:
GitHub Copilot
# Prompt/Command:
I have made changes and additions to the attached files. Add comments and do basic formatting if anything is out of format with the rest of the file. Do not change functionality.

# Output Summary:
Reformatted the files and added comments.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Agreed with the formatting and comments.

----------

# Date/Time:
2026-03-10 16:59
# Tool:
GitHub Copilot
# Prompt/Command:
Running the register curl command results in this error after around a minute:

{
"error": "read ETIMEDOUT"
}

With reference to /email/client.js, help find the issue.

# Output Summary:
Suggested switching away from the previous SMTP port setup and adjusting transport settings to avoid timeout behavior on the current network.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Tested and confirmed the timeout issue was resolved.

----------

# Date/Time:
2026-03-11 16:02
# Tool:
GitHub Copilot
# Prompt/Command:
I made changes for the Reset Password and Forgot Password feature. Check for typos, logic flaws, and variable issues, then add useful comments.

# Output Summary:
Refactored some code without changing functionality, and improved comments and success/error message formatting.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Reviewed and accepted the refactoring/comments after verifying behavior remained correct.

----------

# Date/Time:
2026-03-11 16:19
# Tool:
GitHub Copilot
# Prompt/Command:
For reset links, I plan to use a large random token. I considered two options:

1. Store it in otp_codes as another column
2. Create a new reset_links table

Provide pros/cons and recommend one for this project scale.

# Output Summary:
Recommended extending the existing otp_codes structure and differentiating token purpose to support both short OTP codes and longer reset tokens cleanly.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Agreed with the recommendation and used it while implementing the migration changes.

----------

# Date/Time:
2026-03-11 17:43
# Tool:
GitHub Copilot
# Prompt/Command:
I initialized React/Vite and created components/pages in .js/.jsx by mistake. Convert all frontend files from .js/.jsx to .ts/.tsx without changing logic/flow.

# Output Summary:
Converted frontend files to .ts and .tsx as requested.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Edited minor type-related errors and tested user service endpoints before committing.

----------

# Date/Time:
2026-04-07 15:26
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
I have created the AI microservice under /services/ai. Its key endpoints are /chat (hint generation) and /pseudocode-to-python (convert pseudocode to Python), backed by OpenRouter API.

Provide relevant integration and unit tests under /services/ai/tests that cover these endpoints.

# Output Summary:
Added and updated /services/ai/tests files for endpoint coverage.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Adjusted minor typing issues and reran the AI service endpoint checks before committing.

----------

# Date/Time:
2026-04-10 19:53
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
I created the Execution microservice under /services/execution. It has endpoints to execute Python code and to convert pseudocode to Python then execute it, returning errors, failed test cases, and passed test cases.

Provide relevant integration and unit tests under /services/execution/tests that cover these endpoints.

# Output Summary:
Added and updated /services/execution/tests for main execution flows and expected failures.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Validated the generated tests against service responses and adjusted a few assertions before committing.

----------

# Date/Time:
2026-04-10 23:07
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
Previously I asked for execution-service tests covering two endpoints. I have since removed the pseudocode-to-python-then-execute endpoint.

Update the test files under /services/execution/tests.

# Output Summary:
Updated /services/execution/tests to remove outdated endpoint coverage and keep remaining tests aligned.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Verified the updated suite and endpoint behavior before committing.

----------

# Date/Time:
2026-04-12 21:18
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
I have created the Question microservice under /services/question. It supports CRUD endpoints plus random question retrieval, categories/companies listing, filtering, pagination, and test case handling.

Provide relevant unit and integration tests under /services/question/tests that cover the main endpoints and expected error cases.

# Output Summary:
Updated and added /tests files under /services/question to cover controllers and API routes for create/read/update/delete, random retrieval, list endpoints, validation, and not-found/duplicate scenarios.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Adjusted a few assertions and mock responses to match final payload shape, then reran the question test suite and endpoint checks before committing.
