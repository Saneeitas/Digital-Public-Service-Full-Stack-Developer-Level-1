# Module 5 — Reporting script and REST API

## Reporting script

```bash
node report.js        # run from THIS folder (it reads data/requests.csv)
```

Expected: `{ SUBMITTED: 4, IN_REVIEW: 3, APPROVED: 4, REJECTED: 1 }`

## The API (`api/`)

```bash
cd api
npm ci                # installs Express, Zod and the docs viewer
npm start             # API on http://localhost:3000, data kept in memory
npm test              # starts its own copy of the server on a spare port
npm run docs          # Swagger UI on http://localhost:3001 (start the API first)
```

`npm test` should end with `pass 7`, `fail 0`. Data is held in memory and resets whenever the
server restarts. The OpenAPI description is `api/openapi.yaml`.

Try it:

```bash
curl -s http://localhost:3000/v1/records
curl -s http://localhost:3000/v1/records/999999      # {"error":{"message":"Record not found"}}
```
