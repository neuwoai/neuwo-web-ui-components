const form = document.querySelector("form.sign-up");
const button = form.querySelector("neuwo-button");
const notice = form.querySelector("neuwo-notice");
const entries = form.querySelector(".entries");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const text = [...data].map(([key, value]) => `${key}: ${String(value)}`).join(", ");
  button.loading = true;
  notice.hidden = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    entries.textContent = `Read from the form: ${text}`;
  } finally {
    button.loading = false;
    notice.hidden = false;
  }
});
