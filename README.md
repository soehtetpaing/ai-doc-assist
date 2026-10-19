# AI Doc Assist

A production-oriented backend for an AI-powered document assistant built with `Node.js`, `Express`, `TypeScript`, `PostgreSQL`, `pgvector`, `LangChain.js`, and `streaming LLM providers`.

## Features

- PDF upload, parsing, chunking, and asynchronous ingestion.
- Hybrid retrieval using pgvector cosine similarity and PostgreSQL full-text search.
- Reciprocal Rank Fusion (RRF) for merging retrieval results.
- Cross-encoder re-ranking using ms-marco-MiniLM-L-6-v2.
- Local 384-dimensional embeddings using all-MiniLM-L6-v2.
- Streaming chat responses using Server-Sent Events (SSE).
- Groq primary provider with OpenRouter fallback.
- JWT authentication and bcrypt password hashing.
- Persistent documents, conversations, and messages.
- Request-ID tracing, Pino structured logging, and rate limiting.

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| Validation | Zod |
| AI orchestration | LangChain.js |
| LLM providers | Groq and OpenRouter |
| Embeddings | @huggingface/transformers |
| Re-ranker | ms-marco-MiniLM-L-6-v2 |
| Database | PostgreSQL 18 |
| Vector search | pgvector |
| Keyword search | PostgreSQL tsvector |
| Authentication | JWT and bcrypt |
| Logging | Pino |
| Deployment | Docker Compose |

## System Requirement

- Node.js compatible with project dependencies
- npm
- Docker and Docker Compose, or PostgreSQL 18 with pgvector
- Groq API key
- OpenRouter API key if fallback is enabled

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.dev` file using the variables supported by your application. Example:

```dotenv
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://app_user:change_me@localhost:5432/ai_doc_assist

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free

EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

RERANKER_MODEL=Xenova/ms-marco-MiniLM-L-6-v2
```

Adjust variable names to match your actual configuration. Never commit secrets.

### 3. Start PostgreSQL

```bash
docker compose up -d db
```

Replace `db` with the database service name defined in your Compose configuration.

Enable pgvector if it is not already enabled by your migrations:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Run database migrations

```bash
npm run migrate
```

This command assumes that a `migrate` script exists in `package.json`. Use your configured migration command instead if necessary.

### 5. Start the development server

```bash
npm run dev
```

## API Overview

Example endpoint names; update them to match your implementation.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a user |
| POST | `/api/v1/auth/login` | Authenticate a user |
| GET | `/api/v1/auth/me` | Get the authenticated user |
| POST | `/api/v1/documents` | Upload a PDF |
| GET | `/api/v1/documents` | List documents |
| GET | `/api/v1/documents/:id` | Get document details and status |
| DELETE | `/api/v1/documents/:id` | Delete a document |
| POST | `/api/v1/chat` | Create a stream conversation |
| GET | `/api/v1/chat/conversations` | List conversations |
| GET | `/api/v1/chat/:id/history` | Get conversation history |

Protected endpoints should require a valid access token:

```http
Authorization: Bearer <access_token>
```

## Document Processing

1. Validate the uploaded PDF.
2. Persist document metadata and schedule processing.
3. Extract text and page metadata.
4. Split the text into overlapping chunks.
5. Generate 384-dimensional embeddings.
6. Store chunks, embeddings, and full-text search data.
7. Update the document processing status.

Processing should support failure reporting, retries, and cleanup of incomplete jobs.

## Hybrid Retrieval

The retrieval pipeline combines vector similarity and PostgreSQL full-text search.

1. Embed the user's query.
2. Retrieve candidates through pgvector and full-text search.
3. Merge rankings using Reciprocal Rank Fusion.
4. Re-rank candidates using the cross-encoder.
5. Select relevant chunks within the context budget.
6. Generate an answer grounded in the selected context.
7. Return the answer and source metadata for citation display.

## Streaming and Provider Fallback

Responses are streamed to clients using Server-Sent Events. Client cancellation should propagate to the upstream model request whenever supported.

Groq is the primary LLM provider, with OpenRouter configured as a fallback. Retry only appropriate transient failures. Avoid switching providers after partial output has already been delivered unless the streaming protocol explicitly supports recovery.

## Security and Observability

- Validate incoming payloads with Zod.
- Hash passwords with bcrypt.
- Verify JWTs and enforce resource ownership.
- Apply rate limits to authentication, upload, and chat endpoints.
- Restrict CORS to trusted frontend origins.
- Use parameterized SQL queries.
- Treat uploaded document text as untrusted input.
- Use request IDs and structured Pino logging.
- Never log credentials, access tokens, or API keys.

## Docker Deployment

```bash
docker compose up --build
```

View service logs:

```bash
docker compose logs -f
```

Stop services:

```bash
docker compose down
```

Configure persistent database and upload storage. Do not remove database volumes unless you intend to delete the stored data.

## Development

Common scripts, depending on your `package.json`:

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
```

Use the scripts actually defined in your project.

## License

Specify the project's license here, if applicable.
