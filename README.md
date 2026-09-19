# University OS

Next.js frontend for the University OS study workspace.

Supabase Auth handles sign-in. The browser never receives the AI API key or RAG secret. The server route authenticates the user, calls the existing RAG service, then calls the configured AI provider.

Environment variables are documented in .env.example.
