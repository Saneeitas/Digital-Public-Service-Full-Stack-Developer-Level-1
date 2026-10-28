# Module 6 — The API on PostgreSQL

Needs PostgreSQL 16 running locally and permission to act as the `postgres` user
(see `../tools/create-local-db.sh`, or set `PSQL_SUPER`).

## Setup

```bash
cd api
npm ci
bash ../../tools/create-local-db.sh team1     # makes database team1db and writes .env (not in Git)
npm start                                     # http://localhost:3000
```

In another terminal, from `api/`:

```bash
npm run check                                 # repeatable behaviour checks, ends with All checks passed
bash ../../tools/reset-data.sh                # puts the two starting records back
```

## Transaction drill (Lab 6.4)

The drill servers contain a switch that makes the second database step fail on purpose.
Switch it on by adding this line to `.env`:

```
TRAINING_FAILURE_HOOK=on
```

Then:

```bash
npm run start:drill-unprotected     # one step fails and half the work stays behind
npm run gate                        # in another terminal: reports the damage (FAIL rounds)
# stop the server, reset, then:
npm run start:drill-protected       # same failure, wrapped in a transaction
npm run gate                        # every round passes
```

`server.js` itself has no failure switch; remove the `TRAINING_FAILURE_HOOK` line when you
are done.
