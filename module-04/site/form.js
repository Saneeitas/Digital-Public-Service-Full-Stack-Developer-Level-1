// Lab 4.6 + 4.7a - Reactive form with validation
const form = document.querySelector("form");
const statusBox = document.querySelector("#form-status");

// --- Show / hide the representative section ---------------------------
const onBehalf = document.querySelector("#onBehalf");
const representative = document.querySelector("#representative");
const repName = document.querySelector("#repName");

onBehalf.addEventListener("change", () => {
  representative.hidden = !onBehalf.checked;
  repName.required = onBehalf.checked;
});

// --- Live character count ----------------------------------------------
const details = document.querySelector("#details");
const detailsCount = document.querySelector("#details-count");
const MAX_DETAILS = 500;

function updateCount() {
  const used = details.value.length;
  detailsCount.textContent = `${used} of ${MAX_DETAILS} characters used`;
}

details.addEventListener("input", updateCount);
updateCount();

// --- Showing and clearing messages -------------------------------------
function addDescribedBy(element, id) {
  const ids = (element.getAttribute("aria-describedby") || "")
    .split(" ")
    .filter(Boolean);
  if (!ids.includes(id)) {
    ids.push(id);
  }
  element.setAttribute("aria-describedby", ids.join(" "));
}

function removeDescribedBy(element, id) {
  const ids = (element.getAttribute("aria-describedby") || "")
    .split(" ")
    .filter((item) => item !== "" && item !== id);
  if (ids.length > 0) {
    element.setAttribute("aria-describedby", ids.join(" "));
  } else {
    element.removeAttribute("aria-describedby");
  }
}

function showFieldError(name, message) {
  const input = document.querySelector(`[name="${name}"]`);
  const error = document.querySelector(`#${name}-error`);
  error.textContent = message;
  error.hidden = false;
  if (input.type !== "radio") {
    input.setAttribute("aria-invalid", "true");
  }
  addDescribedBy(input, error.id);
}

function clearFieldError(name) {
  const input = document.querySelector(`[name="${name}"]`);
  const error = document.querySelector(`#${name}-error`);
  error.textContent = "";
  error.hidden = true;
  input.removeAttribute("aria-invalid");
  removeDescribedBy(input, error.id);
}

// --- Check the whole form when it is submitted ---------------------------
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const values = Object.fromEntries(new FormData(form));
  const errors = validateForm(values);

  let firstInvalid = null;
  let problems = 0;

  for (const name of FIELD_NAMES) {
    if (errors[name]) {
      showFieldError(name, errors[name]);
      problems++;
      if (firstInvalid === null) {
        firstInvalid = document.querySelector(`[name="${name}"]`);
      }
    } else if (document.querySelector(`#${name}-error`)) {
      clearFieldError(name);
    }
  }

  if (firstInvalid !== null) {
    const message = `${problems} problem(s) found. Please correct the marked fields.`;
    statusBox.textContent = message;
    firstInvalid.focus();
    return;
  }

  statusBox.textContent =
    "The form is valid. Sending it to the service is added in Module 5.";
});

// Lab 4.7b - Fill the school list from the simulated service
const SCHOOLS_URL = "schools.json";

async function loadSchools() {
  const select = document.querySelector("#school");
  const statusBox = document.querySelector("#form-status");

  try {
    const response = await fetch(SCHOOLS_URL);
    if (!response.ok) {
      throw new Error(`The service answered with status ${response.status}`);
    }
    const schools = await response.json();

    select.options[0].textContent = "Choose a school";
    for (const school of schools) {
      const option = document.createElement("option");
      option.value = school.id;
      option.textContent = school.name;
      select.append(option);
    }
  } catch (error) {
    console.error(error);
    select.options[0].textContent = "Schools are unavailable";
    statusBox.textContent =
      "The list of schools could not be loaded. Please try again later.";
  }
}

loadSchools();
