# PacsFlow Appointments

Multi-tenant appointment scheduling system.

## Quick start

```bash
cp .env.example .env
docker compose up -d
```

API docs: http://localhost:8000/docs

## Key endpoint for QMS integration

```
GET /api/v1/codes/{code}/verify   → client + provider info
POST /api/v1/codes/{code}/use     → mark code as used
```
