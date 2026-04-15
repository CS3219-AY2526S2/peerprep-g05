# AI Usage Log

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
- [x] Accepted as-is
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
Attached are the files jwt.js and password.js under /infrastructure/security. Check if they have been written correctlyt and add some console logs to help me see the output as I verify if they work correctly. I have also decided to pick 4 for the bcrypt SALT_ROUNDS. Is this safe or should I increase it?

# Output Summary:
Corrected import paths, refactored my functions to be cleaner, generated the console.logs and suggested to increase the SALT_ROUNDS for bcrypt to 10-12. 
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Changed some naming conventions to make them more understandable to me and decided to go with 10 SALT_ROUNDS after verifying with online readings.

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
User Class in User.js, changes to authService.js and userService.js to make use of the new User class. Also suggested an "is active user" field to avoid conflicts upon deleting a user due to foreign keys. Additionally, comments to the functions in authService.js and userService.js were added.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Read up the logic on having an isActive field and agreed on its usefulness. Removed some unnecessary additions to the code beyond basic user modelling and authentication.

----------

# Date/Time:
2026-03-01 16:02
# Tool:
GitHub Copilot
# Prompt/Command:
With reference to the attributes of the User class from User.js, check through and add anything missing from this set of sql statements for the initial command to be run when i run "npm urn migrate". Once done, look through userRepository.js and see if I have all the necessary functions. Importantly, I need to have functions that can: create and delete new users, update user profiles, and find users by their respective attributes.

# Output Summary:
Implemented some find functions that I missed and suggested that I do not include the delete function and instead use the useActive for soft-deleting instead.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Read up common practices by other copanies and verified that using the "soft delete" method is widely adopted to avoid conflicts. Still kept the hard delete as an option in case needed.

# Date/Time:
2026-03-01 16:30
# Tool:
GitHub Copilot
# Prompt/Command:
Now I am implementing the controllers for admin, user, and authentication.

See if my implementation is correct and add brief comments to make the functions more understandable as in this part there may be some collaboration with teammates.

# Output Summary:
Fixed some minor mistakes in the functions and added the comments to show the HTTP endpoints for each function.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Verified the changes to the mistakes, which worked after manual testing and accepted the comments.

----------

# Output Summary:
Implemented some find functions that I missed and suggested that I do not include the delete function and instead use the useActive for soft-deleting instead.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Read up common practices by other copanies and verified that using the "soft delete" method is widely adopted to avoid conflicts. Still kept the hard delete as an option in case needed.

----------

# Date/Time:
2026-03-01 16:35
# Tool:
GitHub Copilot
# Prompt/Command:
For the middleware, I need there to be authentication, authorization, and validation. 

For authentication, I need it to check if there exists a valid JWT token tied to the user and to also consider for inactive users, i.e. if the user's isActive field is false.

For Authorization, it should check whether the user has been authenticated and in for some opeartions such as modifying questions, it should check if the user has a valid role, e.g. admin to edit questions.

For Validation, I have one set of rules for registration in validate.js, comment if I should have more, otherwise implement the similar set of rules for login, profile updating, and whatever needs validation.

# Output Summary:
Corrected some mistakes but added another variation of authentication function that is "less strict" and added comments.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Agreed with the fixes and the comments but removed the additional authentication function because it was unnecessary.

# Date/Time:
2026-03-10 15:47
# Tool:
GitHub Copilot
# Prompt/Command:
The following content in the attached file is meant for the database migration for OTPs under user service. Verify if the parameters are valid according to the implementation in the repo and format it to make it more readable.

# Output Summary:
Formatted the file to be more readable and added the created_at field which I forgot
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Agreed with the re-formatting and suggestion to add the created_at field

----------

# Date/Time:
2026-03-01 16:35
# Tool:
GitHub Copilot
# Prompt/Command:
For the middleware, I need there to be authentication, authorization, and validation. 

For authentication, I need it to check if there exists a valid JWT token tied to the user and to also consider for inactive users, i.e. if the user's isActive field is false.

For Authorization, it should check whether the user has been authenticated and in for some opeartions such as modifying questions, it should check if the user has a valid role, e.g. admin to edit questions.

For Validation, I have one set of rules for registration in validate.js, comment if I should have more, otherwise implement the similar set of rules for login, profile updating, and whatever needs validation.

# Output Summary:
Corrected some mistakes but added another variation of authentication function that is "less strict" and added comments.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Agreed with the fixes and the comments but removed the additional authentication function because it was unnecessary.

----------

# Date/Time:
2026-03-10 16:24
# Tool:
GitHub Copilot
# Prompt/Command:
I have made the changes and additions to the attached files. Add comments and do some basic formatting if anything is out of format with the rest of the file. Do NOT change anything else, especially in terms of functionality.

# Output Summary:
Reformatted the file and added comments.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Agreed with the re-formatting and comments.

----------

# Date/Time:
2026-03-10 16:59
# Tool:
GitHub Copilot
# Prompt/Command:
Running the following curl command to register results in the following error after around a minute:

{
"error": "read ETIMEDOUT"
}

With reference to /email/client.js (attached), help me find what the problem is.

# Output Summary:
Previously used port 587 for nodemailer and suggested to use port 456 instead as some networks/ISPs block outbound 587.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Tested and the problem was resolved so the suggested solution worked.

----------

# Date/Time:
2026-03-11 16:02
# Tool:
GitHub Copilot
# Prompt/Command:
I have made the following changes to the attached files for the Reset Password and Forgot Password feature. Look through them, check if there are any typos, flaws in the logic and variables, add useful comments to them.

# Output Summary:
Some code refactoring but the functionality wasn't really changed. Also added comments and formatted the error/success messages better.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Looked through the comments and refactored/reformatted code and they look better but still work as intended.

----------

# Date/Time:
2026-03-11 16:19
# Tool:
GitHub Copilot
# Prompt/Command:
For the reset link, I intend to use a randomly generated token that is large enough to be secure. For this, I have 2 proposals:

1. Store it in the otp_codes table as another column
2. Create a new table for reset_links and store it there

Provide the pros and cons for each method and which one should I implement for this project's scale.

# Output Summary:
Propose that it may be a better solution to convert the original "code" column to accomodate the larger tokens as well and add another column, "purpose" to differentiate whether the code is an OTP of 6 digits or the 64 characters reset token to avoid null values.
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:
Read through and agreed the solution before implementing and used the comments for 003_alter_otp_codes_code_length migration.

----------

# Date/Time:
2026-03-11 17:43
# Tool:
GitHub Copilot
# Prompt/Command:
I made the mistake of initializing react and vite along with creating the rest of the components , functions, and pages in .js and .jsx. Convert ALL of the frontend files from .js to .ts and .ts to .tsx

Do NOT change the logic and flow, only the file types.

# Output Summary:
Converted the frontend folder to .ts and .tsx as specified.
# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected
# Author Notes:
Edited some minor errors due to the new types and then tested all the user service endpoints to ensure everything worked before commiting.

----------

# Date/Time:
2026-04-07 15:26
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
I have created the AI microservice, located under /service/ai. The purpose of this service can be inferred by its 2 endpoints, /chat and /pseudocode-to-python where the first one is for users to obtain hints from the AI whereas the second one is to send pseudocode to be converted into python. The AI here uses OpenRouter API.

Provide the relevant integration and unit under /services/ai/tests that covers the endpoints.

# Output Summary:
/tests files under /services/ai
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:

----------

# Date/Time:
2026-04-10 19:53
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
I have created the Execution microservice, located under /service/execution. This service has 2 endpoints, which is to execute python code and to convert pseudocode to python, then execute it. In both endpoints, they will return errors present, failed test cases, and passed test cases.

Provide the relevant integration and unit under /services/execution/tests that covers the endpoints.

# Output Summary:
/tests files under /services/execution
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes:

----------

# Date/Time:
2026-04-10 23:07
# Tool:
GPT 5.3 - Codex
# Prompt/Command:
Previously, I asked you to generate some test files for the execution service which consisted of 2 endpoints. I have since removed the endpoint for converting pseudocode to python then executing.

Update the test files under /services/execution/tests

# Output Summary:
Updates to the /tests files under /services/execution
# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected
# Author Notes: