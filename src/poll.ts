import { fetchEvent, submitResponse, editResponse, deleteEvent, type EventData } from "./api.js";
import { esc, navigate } from "./main.js";

const VOTE_DISPLAY: Record<string, string> = { yes: "○", maybe: "△", no: "×" };
const VOTE_CYCLE = ["yes", "maybe", "no", ""] as const;

export async function renderPoll(app: HTMLDivElement, slug: string) {
  app.innerHTML = `<div class="container"><p class="loading">Loading...</p></div>`;

  const data = await fetchEvent(slug);
  if (!data) {
    app.innerHTML = `<div class="container"><h1>Not Found</h1><p>This poll does not exist.</p><a href="/" class="btn-primary">Create a new poll</a></div>`;
    app.querySelector("a")?.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("/");
    });
    return;
  }

  render(app, slug, data);
}

function render(app: HTMLDivElement, slug: string, data: EventData) {
  const adminToken = localStorage.getItem(`sched-admin-${slug}`);
  const url = window.location.origin + `/p/${slug}`;

  app.innerHTML = `
    <div class="container">
      <h1 class="poll-title">${esc(data.event.title)}</h1>
      <div class="share-bar">
        <input type="text" id="share-url" value="${esc(url)}" readonly />
        <button id="copy-btn" class="btn-secondary">Copy</button>
      </div>

      ${renderMatrix(data)}

      <h2 class="section-title">Your response</h2>
      <form id="response-form">
        <input type="text" id="resp-name" placeholder="Your name" maxlength="50" required />
        <div class="vote-row">
          ${data.candidates
            .map(
              (c) => `
            <div class="vote-cell">
              <div class="vote-label">${esc(c.label)}</div>
              <button type="button" class="vote-toggle" data-cid="${c.id}" data-value="">—</button>
            </div>
          `,
            )
            .join("")}
        </div>
        <button type="submit" class="btn-primary">Submit</button>
        <p id="resp-error" class="error"></p>
      </form>

      <div class="footer-actions">
        <a href="/" id="back-link">← Create new poll</a>
        ${adminToken ? `<button id="delete-btn" class="btn-danger">Delete poll</button>` : ""}
      </div>
    </div>
  `;

  // Copy URL
  app.querySelector("#copy-btn")?.addEventListener("click", () => {
    const input = app.querySelector<HTMLInputElement>("#share-url")!;
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = app.querySelector<HTMLButtonElement>("#copy-btn")!;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    });
  });

  // Vote toggles
  app.querySelectorAll<HTMLButtonElement>(".vote-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = btn.dataset.value || "";
      const idx = VOTE_CYCLE.indexOf(current as any);
      const next = VOTE_CYCLE[(idx + 1) % VOTE_CYCLE.length];
      btn.dataset.value = next;
      btn.textContent = next ? VOTE_DISPLAY[next] : "—";
      btn.className = `vote-toggle ${next ? `vote-${next}` : ""}`;
    });
  });

  // Submit response
  const form = app.querySelector<HTMLFormElement>("#response-form")!;
  const errorEl = app.querySelector<HTMLParagraphElement>("#resp-error")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const name = app.querySelector<HTMLInputElement>("#resp-name")!.value.trim();
    if (!name) {
      errorEl.textContent = "Please enter your name.";
      return;
    }

    const votes: Record<number, string> = {};
    app.querySelectorAll<HTMLButtonElement>(".vote-toggle").forEach((btn) => {
      const cid = Number(btn.dataset.cid);
      const val = btn.dataset.value;
      if (val) votes[cid] = val;
    });

    try {
      await submitResponse(slug, name, votes);
      await renderPoll(app, slug);
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Failed to submit";
    }
  });

  // Back link
  app.querySelector("#back-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });

  // Delete
  if (adminToken) {
    app.querySelector("#delete-btn")?.addEventListener("click", async () => {
      if (!confirm("Delete this poll? This cannot be undone.")) return;
      await deleteEvent(slug, adminToken);
      localStorage.removeItem(`sched-admin-${slug}`);
      navigate("/");
    });
  }
}

function renderMatrix(data: EventData): string {
  if (data.responses.length === 0) {
    return `<p class="no-responses">No responses yet. Be the first!</p>`;
  }

  const headerCells = data.candidates
    .map((c) => {
      const best = c.id === data.bestId ? " best" : "";
      return `<th class="matrix-header${best}">${esc(c.label)}</th>`;
    })
    .join("");

  const rows = data.responses
    .map((r) => {
      const cells = data.candidates
        .map((c) => {
          const v = r.votes[c.id];
          const display = v ? VOTE_DISPLAY[v] : "—";
          const cls = v ? `vote-${v}` : "vote-empty";
          const best = c.id === data.bestId ? " best" : "";
          return `<td class="${cls}${best}">${display}</td>`;
        })
        .join("");
      return `<tr><td class="name-cell">${esc(r.name)}</td>${cells}</tr>`;
    })
    .join("");

  const summaryCells = data.candidates
    .map((c) => {
      const s = data.summary[c.id];
      const best = c.id === data.bestId ? " best" : "";
      return `<td class="summary-cell${best}">○${s.yes} △${s.maybe} ×${s.no}</td>`;
    })
    .join("");

  return `
    <div class="matrix-wrap">
      <table class="matrix">
        <thead>
          <tr><th></th>${headerCells}</tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="summary-row"><td class="name-cell">Total</td>${summaryCells}</tr>
        </tbody>
      </table>
    </div>
  `;
}
