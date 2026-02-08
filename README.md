# RapidCallAI Dashboard (React + Vite)

This is the web dashboard UI (dark + neon green) for RapidCallAI.

It talks to the API (default production):
- `https://api.rapidcall.ai`

## Local development

Install:

```bash
npm install
```

Run:

```bash
npm run dev
```

Point the dashboard at a local API (optional):

Create `.env`:

```bash
VITE_API_BASE=http://localhost:8787
```

## Production deployment (EC2 + Docker Compose + Caddy)

The dashboard builds to static files and is served by nginx in Docker (see `Dockerfile` + `nginx.conf`).

### Update flow (most common)

```bash
cd /opt/rapidcallai/dashboard
git pull

cd /opt/rapidcallai
docker compose up -d --build dashboard
docker compose logs --tail=120 dashboard
```

### Verify API connectivity

From a browser:
- open `https://dashboard.rapidcall.ai`
- create an agent
- start a web test call
- check Call History and Analytics

From EC2:

```bash
curl -k https://api.rapidcall.ai/health
```

