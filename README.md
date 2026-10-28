# Digital Public Service Full-Stack Developer Level 1 — Complete Runnable Labs

Digital Public Service Full-Stack Developer, Level 1. One folder per module, each holding the
code, data and scripts that the matching lab document walks through.

**Everything here is synthetic.** Citizen IDs look like `CIT-10000001`; no real person, record,
password or token appears anywhere. The services are practice services, not production systems.

| Folder | What is in it | Needs |
|---|---|---|
| `module-01` | Environment check (`hello.js`) | Node 22 |
| `module-02` | Team repository template (README + `.gitignore`) | Git |
| `module-03` | Accessible form and home page (HTML + CSS) | a browser |
| `module-04` | JavaScript practice scripts, validation tests, the enhanced form | Node 22, a browser |
| `module-05` | Reporting script and the REST API with OpenAPI docs and tests | Node 22 |
| `module-06` | The API on PostgreSQL, behaviour checks, transaction drill | Node 22, PostgreSQL 16 |
| `module-07` | Secured service (login, ownership, service token) and a deliberately vulnerable portal to fix | Node 22, PostgreSQL 16 |
| `module-08` | The service with `/health` and the deployment scripts | Node 22, PostgreSQL 16 (a Linux VM for `deploy/`) |
| `module-09` | Provider and consumer services, contract tests, the practice gateway | Node 22, PostgreSQL 16 |
| `module-10` | Journey and failure scripts, gate runner, route audit, status page | the five-service stack |
| `module-11` | Jury scoring calculator, block picker, live-change drill checks | Node 22, the stack for the drills |
| `tools` | `create-local-db.sh`, `reset-data.sh`, `local-stack.sh` | bash, PostgreSQL 16 |

Each module folder has its own `README.md` with the exact commands and what you should see.

## What you need installed

- **Node.js 22** (`node --version` should print v22.x). Nothing else for modules 1–5.
- **Git**.
- **PostgreSQL 16 and `psql`** for modules 6–11, running on your own computer.
- **bash and curl** for the helper scripts (Linux or macOS; on Windows use WSL or Git Bash).

## Testing status — read this before you rely on it

Tested on **Linux, Node 22, PostgreSQL 16**, from a clean copy of this repository:
modules 1–7 (including the browser pages for 3 and 4), 8 (the service), 9, 10 and 11.

**Not tested:**
- Windows PowerShell, macOS and Git Bash. The Node scripts should behave the same;
  the `.sh` helpers have not been run there.
- `module-08/deploy/*`: these are for a real Linux VM with systemd and nginx. They were
  syntax-checked, not run on a VM here.
- The programme's real gateway, real team services, NVDA/screen-reader checks on the
  forms and status page, and a real jury day. The gateway here (`module-09/gateway`) is
  a **stand-in** that follows the charter rules (401 / 403 / 404 / 503).

## Rules for this repository

- **Never commit `.env` or `.env.admin`.** `.gitignore` already blocks them. Only
  `.env.example` files (placeholders) are in the repository.
- Passwords and secrets are made on your computer by `tools/create-local-db.sh`. None is
  stored here.
- `module-07/vulnerable-api` contains a hard-coded secret **on purpose** (it is the flaw the
  lab asks you to find). Never run it anywhere except your own computer.
- Do not add real citizen data, real addresses or real tokens, ever.

## Answer keys

Fixed versions of the Module 7 vulnerable portal and the Module 8 hunt exercise are **not**
in this public repository. They are given to trainers separately.

## Licence

No licence has been chosen yet. Until one is added, the code is "all rights reserved" by
default, even though the repository is public. The repository owner should decide and add a
`LICENSE` file.
