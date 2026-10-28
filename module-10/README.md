# Module 10 — Integration week

Tools for the five-service journey. They need the stack running:

```bash
# from the repository root
bash tools/local-stack.sh setup a b c d e
bash tools/local-stack.sh start
```

## Full journey and failure check (`tools/`)

```bash
node module-10/tools/journey.js .local-stack/journey.config.json            # ends: All checks passed
bash tools/local-stack.sh stop-one d
node module-10/tools/journey.js .local-stack/journey.config.json --down d   # ends: All checks passed
bash tools/local-stack.sh start-one d
```

Reports are written to `.local-stack/evidence/`. For your own deployed services, copy
`journey.config.example.json`, fill in **addresses only** (never tokens), and run the same commands.

`reference-mock.js` stands in for one late provider; it answers `{"mock": true}` on `/health`, and
the journey script then refuses to count it as a delivered service (exit code 3).

## Gate runner

Run it inside a service folder, with that service started:

```bash
cd .local-stack/b
BASE_URL=http://127.0.0.1:3002/v1 bash ../../module-10/tools/run-gates.sh
```

On the practice stack you will see `MISSING` for M4 and M5, because the service folder does not
contain the form tests or the Module 5 test suite. In a team repository that has them, those lines
run. `MANUAL` lines are things a person checks.

## Learner tools (`learner-tools/`)

- `audit-routes.js` — lists every route in `server.js` and which answer without a login:
  `cd .local-stack/b && BASE_URL=http://127.0.0.1:3002 node ../../module-10/learner-tools/audit-routes.js`
- `pick-block.js` — picks a random 10–20 line block from your Git repository to practise explaining it
  (`node pick-block.js "<your name>"`, inside a Git repository with history).
- `status.html` + `status.js` — the citizen status page for service E. The stack copies them into
  E's `public/`; open <http://127.0.0.1:3005/status.html>. Not tested with NVDA.

Tested on Linux with five services, the practice gateway and PostgreSQL 16.
