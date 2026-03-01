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