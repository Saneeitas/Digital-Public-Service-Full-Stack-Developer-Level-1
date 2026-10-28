# Module 8 — Deploy and operate

## `service/` — the service at release 2

The Module 7 service plus a `/health` route that answers `{"status":"ok","release":2}`.

```bash
cd service
npm ci
bash ../../tools/create-local-db.sh m8svc
npm start
curl -s http://localhost:3000/health
npm run check && npm run check:auth && npm run check:service    # each ends with All checks passed
```

## `deploy/` — scripts for a Linux VM (not runnable on your own computer)

| File | Use |
|---|---|
| `health_route.js` | The `/health` route as the lab shows it |
| `recover-test.sh` | Kills the service process and times how long `/health` takes to come back. Edit `SERVICE=` to your team name. Needs systemd and nginx on port 80 |
| `secret-scan.sh` | Looks for the secret values from `.env` inside `~/evidence`. Run on the VM |
| `trainer-provisioning/provision-vm.sh` | Whoever prepares the VM runs this once as root: user, sudoers rule, systemd unit, nginx site |
| `trainer-provisioning/expected-*.txt` | What the unit file and nginx site should look like |

**Tested:** the service, on a local computer. **Not tested:** `deploy/*` on a real VM — they were
only syntax-checked. If your VM differs, your trainer's version wins.

The VM hunt exercise is not in this repository.
