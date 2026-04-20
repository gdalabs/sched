import { createEvent } from "./api.js";
import { esc, navigate } from "./main.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Slot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or ""
}

let selectedSlots: Slot[] = [];
let viewYear: number;
let viewMonth: number; // 0-indexed

export function renderCreate(app: HTMLDivElement) {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  selectedSlots = [];

  app.innerHTML = `
    <div class="container">
      <h1 class="logo">Sched</h1>
      <p class="tagline">Self-hosted scheduling poll</p>
      <form id="create-form">
        <label>Event title</label>
        <input type="text" id="title" placeholder="Dinner meetup, Sprint review..." maxlength="200" required />

        <label>Select candidate dates</label>
        <div id="calendar-wrap"></div>

        <div id="selected-dates"></div>

        <button type="submit" class="btn-primary">Create poll</button>
        <p id="error" class="error"></p>
      </form>
    </div>
  `;

  renderCalendar(app);
  renderSelected(app);

  app.querySelector<HTMLFormElement>("#create-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = app.querySelector<HTMLParagraphElement>("#error")!;
    errorEl.textContent = "";

    const title = app.querySelector<HTMLInputElement>("#title")!.value.trim();
    if (!title) {
      errorEl.textContent = "Please enter a title.";
      return;
    }
    if (selectedSlots.length < 2) {
      errorEl.textContent = "Please select at least 2 dates.";
      return;
    }

    const candidates = selectedSlots.map((s) => formatLabel(s));

    try {
      const result = await createEvent(title, candidates);
      localStorage.setItem(`sched-admin-${result.slug}`, result.admin_token);
      navigate(`/p/${result.slug}`);
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Failed to create event";
    }
  });
}

function formatLabel(s: Slot): string {
  const d = new Date(s.date + "T00:00:00");
  const mon = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAYS[d.getDay()];
  const base = `${mon}/${day} (${dow})`;
  return s.time ? `${base} ${s.time}` : base;
}

function renderCalendar(app: HTMLDivElement) {
  const wrap = app.querySelector<HTMLDivElement>("#calendar-wrap")!;

  const first = new Date(viewYear, viewMonth, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDates = new Set(selectedSlots.map((s) => s.date));

  let cells = "";
  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    cells += `<div class="cal-cell empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const dateStr = toDateStr(dateObj);
    const isPast = dateObj < today;
    const isSelected = selectedDates.has(dateStr);
    const isToday = dateObj.getTime() === today.getTime();
    let cls = "cal-cell";
    if (isPast) cls += " past";
    if (isSelected) cls += " selected";
    if (isToday) cls += " today";
    cells += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
  }

  wrap.innerHTML = `
    <div class="calendar">
      <div class="cal-header">
        <button type="button" class="cal-nav" id="cal-prev">&lsaquo;</button>
        <span class="cal-title">${MONTHS[viewMonth]} ${viewYear}</span>
        <button type="button" class="cal-nav" id="cal-next">&rsaquo;</button>
      </div>
      <div class="cal-days">
        ${DAYS.map((d) => `<div class="cal-day-label">${d}</div>`).join("")}
      </div>
      <div class="cal-grid">
        ${cells}
      </div>
    </div>
  `;

  // Navigation
  wrap.querySelector("#cal-prev")?.addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar(app);
  });

  wrap.querySelector("#cal-next")?.addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar(app);
  });

  // Date selection
  wrap.querySelectorAll<HTMLDivElement>(".cal-cell:not(.empty):not(.past)").forEach((cell) => {
    cell.addEventListener("click", () => {
      const date = cell.dataset.date!;
      const idx = selectedSlots.findIndex((s) => s.date === date);
      if (idx >= 0) {
        selectedSlots.splice(idx, 1);
      } else {
        selectedSlots.push({ date, time: "" });
        selectedSlots.sort((a, b) => a.date.localeCompare(b.date));
      }
      renderCalendar(app);
      renderSelected(app);
    });
  });
}

function renderSelected(app: HTMLDivElement) {
  const wrap = app.querySelector<HTMLDivElement>("#selected-dates")!;

  if (selectedSlots.length === 0) {
    wrap.innerHTML = `<p class="hint">Click dates on the calendar to add candidates</p>`;
    return;
  }

  wrap.innerHTML = `
    <div class="selected-list">
      ${selectedSlots
        .map((s, i) => {
          const d = new Date(s.date + "T00:00:00");
          const mon = d.getMonth() + 1;
          const day = d.getDate();
          const dow = DAYS[d.getDay()];
          return `
            <div class="selected-item" data-idx="${i}">
              <span class="selected-date">${mon}/${day} (${dow})</span>
              <input type="time" class="time-input" value="${s.time}" data-idx="${i}" />
              <button type="button" class="btn-icon remove-slot" data-idx="${i}">&times;</button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  // Time inputs
  wrap.querySelectorAll<HTMLInputElement>(".time-input").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = Number(input.dataset.idx);
      selectedSlots[idx].time = input.value;
    });
  });

  // Remove
  wrap.querySelectorAll<HTMLButtonElement>(".remove-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      selectedSlots.splice(idx, 1);
      renderCalendar(app);
      renderSelected(app);
    });
  });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
