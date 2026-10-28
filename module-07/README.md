# Module 7 — Secure the service

Needs PostgreSQL 16 running locally (see `../tools/create-local-db.sh`).

## `service/` — the secured team service

Login with passwords stored as bcrypt hashes, JWT tokens, record ownership, and a separate
service token for other administrations.

```bash
cd service
npm ci
bash ../../tools/create-local-db.sh m7svc     # writes .env with random JWT_SECRET and SERVICE_TOKEN
npm start                                     # http://localhost:3000
```

In another terminal, from `service/`:

```bash
npm run check            # API behaviour
npm run check:auth       # login and record ownership
npm run check:service    # service-token rules
```

Each ends with `All checks passed`. Reset the data with `bash ../../tools/reset-data.sh`.

## `vulnerable-api/` — the portal you are asked to fix

**Deliberately insecure. It has six planted flaws and a hard-coded secret. Run it only on your own
computer, never on a shared or public machine.**

```bash
cd vulnerable-api
npm ci
bash ../../tools/create-local-db.sh portal    # applies setup.sql, writes .env
npm start                                     # http://localhost:4000
npm run check                                 # in another terminal
```

Untouched, the check ends with `0 of 6 flaws fixed`. Fix the portal as the lab describes, then
run `npm run check` again. After renaming the password column, run
`node --env-file=.env hash-existing-passwords.js` once.

The fixed version is not in this repository.
