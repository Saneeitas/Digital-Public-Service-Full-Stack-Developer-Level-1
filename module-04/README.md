# Module 4 — JavaScript and the enhanced form

## Practice scripts (`labs/`)

```bash
cd labs
node fees.js          # Lab 4.1  prints: Document Copy Request: 4 pages costs 2500 units
node eligibility.js   # Lab 4.2  prints: ELIGIBLE
node reporting.js     # Lab 4.3
node rules.js         # Lab 4.4  PASS lines
node records.js       # Lab 4.5
node test-validation.js   # Lab 4.7a  ends with: 12 of 12 entries behaved as expected
```

## The form (`site/`)

The form loads `schools.json` with `fetch`, which browsers refuse for a file opened by
double-click. Serve it with the small included server:

```bash
node serve.js
```

Then open <http://localhost:8080/form.html>. Stop it with Ctrl+C. Use another port with
`PORT=9000 node serve.js` (on Windows set the variable in the shell first).

## Note on the two `validation.js` files

`labs/validation.js` is the state after Lab 4.7a. `site/validation.js` is the final state
(it also has the "school" rule from Lab 4.7b), so the two differ by design.
