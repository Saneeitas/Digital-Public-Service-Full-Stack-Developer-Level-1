# Module 9 — Integration, contracts and resilience

| Folder | What it is |
|---|---|
| `provider-service/` | Service A: your service plus the charter route `GET /v1/service/citizens/{citizenId}/status`, its `openapi.yaml`, and provider tests |
| `consumer-service/` | A service that calls others through the gateway: `dependency.js` (timeout, clean failure messages), consumer contract tests for A and D, `slow-server.js` + `try-slow.js` |
| `gateway/` | The practice gateway (stand-in): consumer token check (401), allowed pairs (403), forwards with the provider's own service token, 503 when a provider is down or slow, JSON-lines log |

## Run everything on your own computer

From the repository root (needs Node 22 and PostgreSQL 16):

```bash
bash tools/local-stack.sh setup a b d      # folders, databases, secrets, gateway config → .local-stack/
bash tools/local-stack.sh start            # gateway + services A, B, D
cd .local-stack/b && npm run contract      # consumer contract tests: 21 pass
cd ../a && npm run contract                # provider tests: 8 pass
```

Try the timeout lesson (from `.local-stack/b`):

```bash
node slow-server.js &                      # answers after 10 seconds, port 4010
node --env-file=.env try-slow.js           # gives up after about 2000 ms with a clear message
kill %1
```

Stop and remove everything with `bash tools/local-stack.sh stop` and `... clean`.

Everything under `.local-stack/` is generated and ignored by Git; its secrets are random and local.

## Notes

- The provider tests read `OWN_URL` (set by the script) to find service A.
- The real gateway of the programme will have its own addresses and tokens. Put those in `.env`,
  never in the code.
