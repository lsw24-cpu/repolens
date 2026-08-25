# Deployment

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Production validation

```bash
npm run lint
npm test
npm run start
```

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `GITHUB_TOKEN` | No | Raises the GitHub API limit; public repositories still work without it |
| `DEEPSEEK_API_KEY` | No | Enables model-assisted analysis; deterministic evidence fallback works without it |
| `DEEPSEEK_MODEL` | No | Overrides the default `deepseek-v4-flash` |

Do not commit `.env.local`, tokens, or other secrets. Manage hosted values through encrypted platform environment variables.
