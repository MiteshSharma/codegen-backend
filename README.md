# Codegen Backend

This is a backend service designed to power conversational AI applications capable of generating and deploying code, specifically frontend projects (like React applications). It manages conversation history, interacts with Large Language Models (LLMs), handles build/deployment processes, and supports branching for different development lines within a conversation.

## Features

-   **Conversational AI:** Manages conversations and message history using PostgreSQL and TypeORM.
-   **LLM Integration:** Interfaces with LLMs (e.g., OpenAI's GPT models) for generating responses and code.
-   **Code Generation:** Specialized prompts and logic (`DeveloperAgentService`) to guide LLMs in generating frontend code (React, TypeScript) based on user requests.
-   **Project Management:**
    -   Initializes a base project structure (`base_project`).
    -   Updates project files based on generated code.
-   **Build & Deploy:**
    -   Builds generated frontend projects (`npm install`, `npm run build`).
    -   Simulates deployment (local implementation provided).
    -   Provides real-time progress updates via Server-Sent Events (SSE).
    -   Stores build/deployment logs in the database.
-   **Branching:** Supports different branches within a conversation, allowing parallel development or experimentation based on specific messages.
-   **API:** Exposes RESTful API endpoints (using Express) for:
    -   Managing conversations and messages.
    -   Triggering build and deploy processes per branch.
-   **Database Migrations:** Uses TypeORM migrations to manage database schema changes.
-   **Configuration:** Environment variable based configuration (`.env` file).
-   **Logging:** Uses Winston for structured logging.
-   **Validation:** Uses Zod for request validation.

## Prerequisites

-   Node.js (v20.11.1 or later recommended - check `.nvmrc`)
-   npm (usually comes with Node.js)
-   PostgreSQL (v16 or later recommended)
-   An LLM API Key (e.g., OpenAI API Key)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd codegen-backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  **Copy the example environment file:**
    ```bash
    cp .env.example .env
    ```
2.  **Edit the `.env` file:**
    -   Fill in your PostgreSQL database connection details (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`).
    -   Add your LLM API key (e.g., `OPENAI_API_KEY`).
    -   Configure other settings as needed (e.g., `PORT`).

## Database Setup

1.  Ensure your PostgreSQL server is running and accessible with the credentials provided in `.env`.
2.  **Run database migrations:** This will create the necessary tables (`conversations`, `messages`, `build_logs`, etc.).
    ```bash
    npm run typeorm migration:run
    ```
    *Note: You might need to create the database specified in `.env` manually before running migrations if it doesn't exist.*

## Running the Application

1.  **Development Mode:**
    -   Starts the server with hot reloading using `ts-node-dev`.
    -   Logs will be printed to the console.
    ```bash
    npm run dev
    ```
    The API will typically be available at `http://localhost:3000` (or the `PORT` specified in `.env`).

2.  **Production Mode:**
    -   Builds the TypeScript code into JavaScript.
    ```bash
    npm run build
    ```
    -   Starts the application using the compiled JavaScript code.
    ```bash
    npm start
    ```

## API Overview

The application exposes several API endpoints. Here are some key ones:

-   **`POST /api/messages`**: Process a user message. Can start a new conversation or continue an existing one. Handles interaction with the LLM and code generation agent. Supports streaming responses.
-   **`GET /api/conversations`**: List all conversations.
-   **`GET /api/conversations/:conversationId/messages`**: Get all messages for a specific conversation.
-   **`POST /api/conversations/:conversationId/build-deploy`**: Trigger the build and deploy process for the latest message on a specific branch (defaults to `main`). Streams progress via SSE.
    ```bash
    # Example: Trigger build for the 'main' branch
    curl -X POST http://localhost:3000/api/conversations/{conv_id}/build-deploy \
      -H "Accept: text/event-stream" -N

    # Example: Trigger build for a specific branch
    curl -X POST http://localhost:3000/api/conversations/{conv_id}/build-deploy \
      -H "Accept: text/event-stream" \
      -H "Content-Type: application/json" \
      -d '{"branch": "feature/new-ui"}' -N
    ```

*(Refer to the API route definitions in `src/api/routes/` and controllers in `src/api/controllers/` for more details).*

## Project Structure Highlights

```
src/
├── api/              # Express controllers, routes, DTOs, middleware
├── domain/           # Core business logic domains
│   ├── llm/          # LLM client interfaces and implementations
│   └── project/      # Project building, deployment, storage logic
├── models/           # TypeORM entity definitions and related types (enums)
├── repository/       # Data access layer (interfaces and implementations)
│   ├── database/     # TypeORM repositories
│   └── external/     # Repositories for external APIs (e.g., OpenAI)
├── services/         # Service layer orchestrating business logic
├── migrations/       # Database migration files
├── utils/            # Utility functions (config, logger, etc.)
├── app.ts            # Express application setup
└── server.ts         # Server entry point
base_project/         # Template for generated frontend projects
.env.example          # Example environment variables
ormconfig.ts          # TypeORM configuration
package.json
tsconfig.json
README.md             # This file
```

## Development Notes

-   **Linting:** Run `npm run lint` to check code style.
-   **Type Checking:** Run `npm run type-check` to check TypeScript types.
-   **Formatting:** Run `npm run format` to format code using Prettier.
