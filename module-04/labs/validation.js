// Lab 4.7a - Validation rules (no DOM code in this file)
const FIELD_NAMES = [
  "fullName",
  "citizenId",
  "dateOfBirth",
  "preferredContact",
  "repName",
  "details",
];

function isRealIsoDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const date = new Date(text);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
  );
}

function validateField(name, value, today = new Date()) {
  const text = (value || "").trim();

  if (name === "fullName") {
    if (text === "") return "Enter your full name.";
    if (text.length > 100) return "Full name must be 100 characters or fewer.";
    return "";
  }

  if (name === "citizenId") {
    if (text === "") return "Enter your Citizen ID.";
    if (!/^CIT-\d{8}$/.test(text)) {
      return (
        "Citizen ID must be CIT- followed by eight digits, " +
        "for example CIT-12345678."
      );
    }
    return "";
  }

  if (name === "dateOfBirth") {
    if (text === "") return "Enter your date of birth.";
    if (!isRealIsoDate(text)) return "Enter a real date of birth.";
    if (new Date(text) > today) return "Date of birth cannot be in the future.";
    return "";
  }

  if (name === "preferredContact") {
    if (!["email", "phone", "post"].includes(text))
      return "Choose one contact method.";
    return "";
  }

  if (name === "repName") {
    if (text === "") return "Enter your full name as the representative.";
    return "";
  }

  if (name === "details") {
    if (text.length > 500)
      return "Additional details must be 500 characters or fewer.";
    return "";
  }

  return "";
}

function validateForm(values, today = new Date()) {
  const errors = {};
  for (const name of FIELD_NAMES) {
    if (name === "repName" && !values.onBehalf) {
      continue;
    }
    const message = validateField(name, values[name], today);
    if (message !== "") {
      errors[name] = message;
    }
  }
  return errors;
}

// Lets Node load this file for testing; the browser ignores it.
if (typeof module !== "undefined") {
  module.exports = { validateField, validateForm };
}
