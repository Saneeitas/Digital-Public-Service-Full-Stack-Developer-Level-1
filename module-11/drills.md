# Three live-change drills

Do these in pairs, on a copy of your service that you can break. Your wording will differ a little
from the reference service, so find the matching place in your own `server.js`.

Each drill has three parts: **look, change, check**. Always restart the service before you check.

Set the address once (default is `http://localhost:3000`):

```bash
export BASE_URL=http://localhost:3000
```

## Drill 1 — change an error message

1. Look: `bash check-drills.sh 1 before` — asking for record 999999 answers `Record not found`.
2. Change: in `server.js` replace the text `Record not found` with `No such record`. Restart.
3. Check: `bash check-drills.sh 1 after`.

## Drill 2 — make a rule stricter

1. Look: `bash check-drills.sh 2 before` — a 13-character password is accepted (201).
   The password rule is `min(12)` in `server.js`.
2. Change: replace `12` with `14`. Restart.
3. Check: `bash check-drills.sh 2 after` — 13 characters now answers 400, 14 characters 201.
   (The script makes up a new citizen ID each run; registering the same citizen twice answers 409.)

## Drill 3 — change the words of a validation message

1. Look: `bash check-drills.sh 3 before` — an invalid record is refused with `Invalid request body`.
2. Change: replace `Invalid request body` with `The request is not valid`. Restart.
3. Check: `bash check-drills.sh 3 after` — the message has the new words and the fields list is unchanged.

If a change breaks something, say so and undo it: `git checkout -- server.js`.

These drills were run on the reference service. The real jury decides what counts as a "small change";
do not train yourself to expect only these.
