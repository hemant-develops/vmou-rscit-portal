const state = {
  query: "",
  event: "All",
  status: "All",
  dob: "",
  learners: [],
  selectedId: ""
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  eventFilter: document.getElementById("eventFilter"),
  statusFilter: document.getElementById("statusFilter"),
  dobInput: document.getElementById("dobInput"),
  searchBtn: document.getElementById("searchBtn"),
  clearBtn: document.getElementById("clearBtn"),
  searchMeta: document.getElementById("searchMeta"),
  resultCount: document.getElementById("resultCount"),
  recordsList: document.getElementById("recordsList"),
  detailCard: document.getElementById("detailCard")
};

function initials(name) {
  return String(name || "Learner")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function safe(value, fallback = "Not recorded") {
  return value === undefined || value === null || String(value).trim() === "" ? fallback : value;
}

function setLoading() {
  elements.recordsList.innerHTML = '<div class="empty-state">Searching real imported records...</div>';
  elements.detailCard.innerHTML = "<h2>Learner details</h2><p>Select a learner to see complete exam history.</p>";
}

async function loadEvents() {
  const response = await fetch("/api/events");
  const data = await response.json();

  data.events.forEach((event) => {
    const option = document.createElement("option");
    option.value = event;
    option.textContent = event;
    elements.eventFilter.appendChild(option);
  });

  elements.searchMeta.textContent = data.totalRows
    ? `${data.totalRows.toLocaleString()} result rows loaded from Access import.`
    : "No real result data imported yet. Put Access files in full-data and run the import command.";
}

async function runSearch() {
  state.query = elements.searchInput.value.trim();
  state.event = elements.eventFilter.value;
  state.status = elements.statusFilter.value;
  state.dob = elements.dobInput.value.trim();

  if (!state.query && state.event === "All" && state.status === "All" && !state.dob) {
    state.learners = [];
    state.selectedId = "";
    renderList({
      hasData: true,
      matchedRows: 0,
      elapsedMs: 0,
      emptyMessage: "Enter a scholar number, learner code, name, or father name to search real records."
    });
    return;
  }

  setLoading();

  const params = new URLSearchParams({
    q: state.query,
    event: state.event,
    status: state.status,
    dob: state.dob
  });

  const response = await fetch(`/api/search?${params.toString()}`);
  const data = await response.json();
  state.learners = data.learners || [];

  if (state.learners.length && !state.learners.some((learner) => learner.id === state.selectedId)) {
    state.selectedId = state.learners[0].id;
  }

  renderList(data);
}

function renderList(data) {
  const count = state.learners.length;
  elements.resultCount.textContent = `${count} ${count === 1 ? "learner" : "learners"}`;

  if (data.hasData === false) {
    elements.searchMeta.textContent = "No imported data found.";
    elements.recordsList.innerHTML = `
      <div class="empty-state">
        Real data is not loaded yet. Add .mdb or .accdb files to D:\\vmou\\full-data, then run npm run import:access.
      </div>
    `;
    return;
  }

  elements.searchMeta.innerHTML = data.elapsedMs
    ? `Search completed in <strong>${(data.elapsedMs / 1000).toFixed(2)} seconds</strong> · ${data.matchedRows.toLocaleString()} matching attempts`
    : data.emptyMessage || "";

  if (!count) {
    elements.recordsList.innerHTML = `
      <div class="empty-state">
        ${data.emptyMessage || "No matching learner found in imported result data."}
      </div>
    `;
    elements.detailCard.innerHTML = "<h2>Learner details</h2><p>Select a learner to see complete exam history.</p>";
    return;
  }

  elements.recordsList.innerHTML = state.learners
    .map((learner) => {
      const latest = learner.latest || {};
      const active = learner.id === state.selectedId ? "active" : "";
      const resultClass = String(latest.result || "").toLowerCase();

      return `
        <article class="record-card ${active}" data-id="${learner.id}" tabindex="0">
          <div>
            <h3>${safe(learner.name, "Unnamed learner")}</h3>
            <p>${learner.learnerKey}</p>
            <p>${safe(latest.event)} · ${learner.attempts.length} ${learner.attempts.length === 1 ? "attempt" : "attempts"}</p>
          </div>
          <div class="record-side">
            <span class="badge ${resultClass}">${safe(latest.result, "RESULT")}</span>
            <span class="marks">${safe(latest.total, "-")}</span>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".record-card").forEach((card) => {
    const selectCard = () => {
      state.selectedId = card.dataset.id;
      renderList({ ...data, elapsedMs: 0 });
      renderDetail();
    };

    card.addEventListener("click", selectCard);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCard();
      }
    });
  });

  renderDetail();
}

function renderAttempt(attempt, index) {
  const title = safe(attempt.event, `Attempt ${index + 1}`);
  const resultClass = String(attempt.result || "").toLowerCase();

  return `
    <div class="attempt-card">
      <div class="attempt-title">
        <h3>${title}</h3>
        <span class="badge ${resultClass}">${safe(attempt.result, "RESULT")}</span>
      </div>

      <div class="score-row">
        <span>Internal <strong>${safe(attempt.internal, "-")}/30</strong></span>
        <span>Theory <strong>${safe(attempt.theory, "-")}/70</strong></span>
        <span>Total <strong>${safe(attempt.total, "-")}/100</strong></span>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><span>Roll number</span><strong>${safe(attempt.roll)}</strong></div>
        <div class="detail-item"><span>Exam centre</span><strong>${safe(attempt.examCentre)}</strong></div>
        <div class="detail-item"><span>ITGK code</span><strong>${safe(attempt.itgkCode)}</strong></div>
        <div class="detail-item"><span>Mobile</span><strong>${safe(attempt.mobile)}</strong></div>
        <div class="detail-item"><span>Barcode</span><strong>${safe(attempt.barcode)}</strong></div>
        <div class="detail-item"><span>Booklet series</span><strong>${safe(attempt.bookletSeries)}</strong></div>
      </div>

      <p class="source-note">Source: ${safe(attempt.sourceFile)}${attempt.sourceTable ? ` · ${attempt.sourceTable}` : ""}</p>
    </div>
  `;
}

function renderDetail() {
  const learner = state.learners.find((item) => item.id === state.selectedId);

  if (!learner) {
    return;
  }

  const latest = learner.latest || {};
  elements.detailCard.innerHTML = `
    <div class="profile-head">
      <div class="avatar">${initials(learner.name)}</div>
      <div>
        <h2>${safe(learner.name, "Unnamed learner")}</h2>
        <p>${learner.learnerKey}</p>
        <p>Father: ${safe(learner.father)}${learner.dob ? ` · Born ${learner.dob}` : ""} · ${safe(latest.itgk)}</p>
      </div>
    </div>

    ${learner.attempts.map(renderAttempt).join("")}
  `;
}

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function bindEvents() {
  const debouncedSearch = debounce(runSearch, 250);
  elements.searchInput.addEventListener("input", debouncedSearch);
  elements.eventFilter.addEventListener("change", runSearch);
  elements.statusFilter.addEventListener("change", runSearch);
  elements.dobInput.addEventListener("input", debouncedSearch);
  elements.searchBtn.addEventListener("click", runSearch);
  elements.clearBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.eventFilter.value = "All";
    elements.statusFilter.value = "All";
    elements.dobInput.value = "";
    runSearch();
  });
}

loadEvents()
  .then(() => {
    elements.searchInput.value = "";
    bindEvents();
    runSearch();
  })
  .catch((error) => {
    elements.recordsList.innerHTML = `<div class="empty-state">Could not load data API: ${error.message}</div>`;
  });
