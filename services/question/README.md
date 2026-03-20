# Question Microservice

Manages coding questions for the PeerPrep platform.

## Features

- CRUD operations for questions
- Filter questions by complexity (Easy, Medium, Hard)
- Filter questions by category
- Full-text search across title & description
- Pagination with metadata (page, limit, total, totalPages)
- Duplicate title prevention (case-insensitive)
- List all distinct categories
- Get random questions for matching
- Centralised error handling & request logging
- Graceful shutdown (SIGINT / SIGTERM)

## API Endpoints

### GET /health
Service health check (also pings the database).

### GET /api/v1/questions
Get all questions with optional filters and pagination.

Query Parameters:
- `complexity` (optional): Easy, Medium, or Hard
- `category` (optional): Filter by category
- `search` (optional): Case-insensitive text search on title & description
- `page` (optional, default 1): Page number
- `limit` (optional, default 20, max 100): Items per page

Response includes a `pagination` object:
```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### GET /api/v1/questions/random
Get a random question with optional filters.

Query Parameters:
- `complexity` (optional): Easy, Medium, or Hard
- `category` (optional): Filter by category

### GET /api/v1/questions/categories
List all distinct categories currently in the database.

### GET /api/v1/questions/:id
Get a specific question by ID.

### POST /api/v1/questions
Create a new question. Returns `409` if a question with the same title already exists (case-insensitive).

Request Body:
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers...",
  "categories": ["Array", "Hash Table"],
  "complexity": "Easy"
}
```

### PUT /api/v1/questions/:id
Update an existing question. At least one field must be supplied.

Request Body: (all fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description...",
  "categories": ["Array"],
  "complexity": "Medium"
}
```

### DELETE /api/v1/questions/:id
Delete a question.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=3002
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=questions_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_POOL_MAX=10
NODE_ENV=development
```

3. Ensure PostgreSQL is running

4. Start the service:
```bash
node server.js
```

The service will automatically create the necessary database tables and indexes on startup.
