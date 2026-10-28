// Lab 4.2 - Child enrolment decision (illustrative stand-in rule)
const MIN_AGE = 5;
const MAX_AGE = 12;

const age = 7;
const guardianConfirmed = true;

let decision;
if (!guardianConfirmed) {
  decision = "NOT ELIGIBLE: guardian confirmation missing";
} else if (age < MIN_AGE) {
  decision = "NOT ELIGIBLE: child is under " + MIN_AGE;
} else if (age > MAX_AGE) {
  decision = "NOT ELIGIBLE: child is over " + MAX_AGE;
} else {
  decision = "ELIGIBLE";
}

console.log(decision);
