# Collaboration Service

## Getting Started

### Prerequisites

**Production Server:**

- Docker

**Local Development:**

- Node.js 24+
- MongoDB instance (or use Docker Compose)

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable       | Description                     | Example                                            |
| -------------- | ------------------------------- | -------------------------------------------------- |
| `MONGO_URI`    | MongoDB connection string       | `mongodb://localhost:27017/peerprep-collaboration` |
| `EXPRESS_PORT` | Port the HTTP server listens on | `51392`                                            |

### Running with Docker Compose

```bash
docker compose up --build
```

This starts both the collaboration server and a MongoDB instance. MongoDB data is persisted in `./data/mongodb`.

### Building for Production

```bash
npm install
npm run build    # build the project to /dist
npm run start    # run the server
```

### Running Locally for Development

```bash
npm install
npm run dev      # supports hot-reloading
```

## Project Structure

The project structure is based on this article here: [Best Practices for Structuring an Express.js Project - DEV Community](https://dev.to/moibra/best-practices-for-structuring-an-expressjs-project-148i)
