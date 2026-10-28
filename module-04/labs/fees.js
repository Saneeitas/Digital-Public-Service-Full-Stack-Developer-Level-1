// Lab 4.1 - Fee and date calculator (synthetic fee schedule)
const serviceName = "Document Copy Request";
const baseFee = 1500;
const feePerPage = 250;
let pages = 4;

const totalFee = baseFee + feePerPage * pages;
console.log(`${serviceName}: ${pages} pages costs ${totalFee} units`);

// Form values arrive as text, not numbers
const pagesFromForm = "4";
console.log(pagesFromForm + 1);
console.log(Number(pagesFromForm) + 1);
console.log(typeof pagesFromForm, typeof Number(pagesFromForm));
console.log(Number("abc"));

// Dates
const submitted = new Date("2026-10-08");
const deadline = new Date(submitted);
deadline.setUTCDate(deadline.getUTCDate() + 30);
console.log(deadline.toISOString().slice(0, 10));

const today = new Date("2026-10-20");
const msPerDay = 1000 * 60 * 60 * 24;
const daysLeft = Math.round((deadline - today) / msPerDay);
console.log(`Days left: ${daysLeft}`);
