const form = document.getElementById("login");
const message = document.getElementById("message");
const list = document.getElementById("statuses");

const NAMES = { a: "Registry", b: "Education", c: "Social Services", d: "Health" };

// One line of plain text for one administration. A failed dependency is shown
// with its message, never hidden and never replaced by a blank.
function describe(item) {
  const name = NAMES[item.provider] || item.provider.toUpperCase();
  if (!item.available) return item.message; // it already names the service
  if (!item.found) return `${name}: ${item.message}`;
  const status = item.status.replace("_", " ").toLowerCase();
  return `${name}: ${status}, since ${item.submittedOn}`;
}

function showStatuses(dependencies) {
  list.replaceChildren();
  for (const item of dependencies) {
    const entry = document.createElement("li");
    entry.textContent = describe(item); // text only, never innerHTML
    list.append(entry);
  }
}

async function loadStatuses(citizenId, password) {
  const login = await fetch("/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citizenId, password }),
  });
  if (login.status === 401) {
    return { problem: "Citizen ID or password is incorrect." };
  }
  if (!login.ok) throw new Error(`login answered ${login.status}`);
  const { token } = await login.json(); // kept in this function only
  const reply = await fetch("/v1/me/dependencies", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!reply.ok) throw new Error(`dependencies answered ${reply.status}`);
  return { dependencies: (await reply.json()).dependencies };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  list.replaceChildren();
  message.textContent = "Loading your statuses.";
  try {
    const result = await loadStatuses(form.citizenId.value, form.password.value);
    if (result.problem) {
      message.textContent = result.problem;
      return;
    }
    showStatuses(result.dependencies);
    message.textContent = "Your statuses are shown below.";
  } catch (error) {
    console.error(error.message);
    message.textContent =
      "We cannot show your statuses right now. Please try again later.";
  }
});
