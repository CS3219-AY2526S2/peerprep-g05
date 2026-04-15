[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/HpD0QZBI)
# CS3219 Project (PeerPrep) - AY2526S2
## Group: G05

### Quickstart

Steps for set up:

1. Install the following prerequisites program:
    - [Docker Desktop](https://docs.docker.com/desktop/) and ensure it is running.
2. Download the entire source code [here](https://github.com/CS3219-AY2526S2/peerprep-g05/archive/refs/heads/main.zip)
3. Unzip the zipfile, enter the directory, and click on _peerprep-g05-main_ again.
4. Add a `.env` file in the relevant microservices based on the document provided.
    * Folders that have an `.env` file:
        - `gateway/`
        - `frontend`
        - `services/ai/`
        - `services/collaboration/`
        - `services/execution/`
        - `services/matching/`
        - `services/question/`
        - `services/user/`
5. Inititalise docker for the very first time that the project is set up by running the commands in `dockerInit.sh`.
6. Open a terminal in that directory (with this README.md) and run the following command:
    ```bash
    docker compose up --build
    ```
7. Wait about 1-2 minute for all the services to build start up.
8. Access the application at `http://localhost:5173`

### Code Folder Structure

Below is a high-level overview of the folder structure.

- `frontend/`: React frontend SPA
- `backend/`: Gateway in server.js
- `services/`: All backend microservices, each in their own folder
    - `ai/`: AI service for chatting and code translation
    - `collaboration/`: Collaboration service for real-time code editing
    - `execution/`: Code execution service for running user code
    - `matching/`: User matching service for pairing users for a collaborative session
    - `question/`: Question management service to store, edit, delete and view questions
    - `user/`: User management service for authentication and admin promotion
