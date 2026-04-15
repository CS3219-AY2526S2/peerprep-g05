# Collaboration Service

## Getting Started

### Prerequisites

**Production Server:**

- Docker

**Local Development:**

- Node.js 24+
- Redis instance (or use Docker Compose)

### Running with Docker Compose

```bash
docker compose up --build
```
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
