(function () {
  const data = window.RECLAIM_DATA;
  const refs = {
    runButton: document.getElementById("runButton"),
    replayButton: document.getElementById("replayButton"),
    runTimer: document.getElementById("runTimer"),
    modePill: document.getElementById("modePill"),
    apiPill: document.getElementById("apiPill"),
    moneyCounter: document.getElementById("moneyCounter"),
    queueStat: document.getElementById("queueStat"),
    caseList: document.getElementById("caseList"),
    railList: document.getElementById("railList"),
    proofStrip: document.getElementById("proofStrip"),
    caseTabs: document.getElementById("caseTabs"),
    caseSpotlight: document.getElementById("caseSpotlight"),
    memoBody: document.getElementById("memoBody"),
    memoStatus: document.getElementById("memoStatus"),
    approvalForm: document.getElementById("approvalForm"),
    approvalReason: document.getElementById("approvalReason"),
    approveButton: document.getElementById("approveButton"),
    overrideButton: document.getElementById("overrideButton"),
    formError: document.getElementById("formError"),
    citationDrawer: document.getElementById("citationDrawer"),
    drawerBody: document.getElementById("drawerBody"),
    drawerClose: document.getElementById("drawerClose")
  };

  const state = {
    selectedCaseId: "CKT-ATL-014",
    running: false,
    approved: false,
    currentTotal: 0,
    timerStartedAt: null,
    timerHandle: null,
    railEvents: [],
    queueStatus: new Map(),
    memoReady: false,
    traceMode: "live",
    approval: null,
    memo: null,
    backendEventsByCase: new Map(),
    backendMemos: new Map(),
    citations: new Map(Object.entries(data.documents || {})),
    apiBase: "",
    backendMode: "checking",
    backendReason: "Checking backend",
    backendHealth: null,
    backendChecked: false,
    backendCheckPromise: null,
    stream: null
  };

  const query = new URLSearchParams(window.location.search);
  const forcedFallback = query.has("fallback") || query.has("offline") || query.get("mode") === "fallback";
  const explicitApiBase = query.get("api") || window.RECLAIM_API_BASE || "";
  const apiCandidates = getApiCandidates();
  state.apiBase = apiCandidates[0] || "";

  const liveCaseIds = data.liveCases.map((item) => item.id);
  const allRows = [
    ...data.liveCases.map((item) => ({
      id: item.id,
      ban: item.ban,
      store: item.store,
      route: item.route,
      amount: getCaseCredit(item).recoverableAmount,
      live: true
    })),
    ...data.portfolioRows.map(([id, ban, store, route, amount]) => ({
      id,
      ban,
      store,
      route,
      amount,
      live: false
    }))
  ];

  class BackendHttpError extends Error {
    constructor(response, bodyText) {
      super(`Backend returned HTTP ${response.status}`);
      this.name = "BackendHttpError";
      this.status = response.status;
      this.bodyText = bodyText;
    }
  }

  function getApiCandidates() {
    if (explicitApiBase) return [stripTrailingSlash(explicitApiBase)];
    if (window.location.protocol === "file:") {
      return ["http://127.0.0.1:8765", "http://127.0.0.1:8000"];
    }

    const candidates = [""];
    const onLocalWebPort = ["3000", "5173", "5500", "8000", "8001", "8080", "8765"].includes(window.location.port);
    if (onLocalWebPort || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      candidates.push("http://127.0.0.1:8765");
      candidates.push("http://127.0.0.1:8000");
    }
    return [...new Set(candidates)];
  }

  function stripTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function apiUrl(path, base) {
    const root = stripTrailingSlash(base === undefined ? state.apiBase : base);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return root ? `${root}${cleanPath}` : cleanPath;
  }

  function withTimeout(ms) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), ms);
    return { controller, timer };
  }

  async function requestJson(path, options, settings) {
    const requestSettings = settings || {};
    const { controller, timer } = withTimeout(requestSettings.timeout || 6000);
    const headers = {
      Accept: "application/json",
      ...(options && options.body ? { "Content-Type": "application/json" } : {}),
      ...((options && options.headers) || {})
    };

    try {
      const response = await fetch(apiUrl(path, requestSettings.base), {
        ...options,
        headers,
        signal: controller.signal
      });
      const bodyText = await response.text();
      if (!response.ok) throw new BackendHttpError(response, bodyText);
      if (!bodyText) return null;
      try {
        return JSON.parse(bodyText);
      } catch (error) {
        return { text: bodyText };
      }
    } finally {
      window.clearTimeout(timer);
    }
  }

  function isOfflineError(error) {
    return navigator.onLine === false ||
      error.name === "AbortError" ||
      error.name === "TypeError" ||
      /failed to fetch|network|load failed|event stream/i.test(error.message || "");
  }

  function setBackendMode(mode, reason, health) {
    state.backendMode = mode;
    state.backendReason = reason || "";
    if (health !== undefined) state.backendHealth = health;
    renderTransportLabels();
  }

  function renderTransportLabels() {
    if (refs.modePill) {
      const labels = {
        checking: "Checking backend",
        backend: "Live backend",
        fallback: "Local fallback",
        replay: "Golden replay",
        error: "Backend error"
      };
      refs.modePill.textContent = labels[state.backendMode] || `Mode: ${state.backendMode}`;
      refs.modePill.title = state.backendReason || "";
      refs.modePill.className = `status-pill ${state.backendMode === "backend" ? "status-pill--compute" : ""}`;
    }

    if (refs.apiPill) {
      const base = state.apiBase || "same-origin";
      refs.apiPill.textContent = `API: ${state.backendMode === "fallback" || state.backendMode === "replay" ? "local" : base}`;
      refs.apiPill.title = state.backendReason || base;
    }
  }

  async function ensureBackendChecked() {
    if (state.backendChecked) return state.backendMode === "backend";
    if (state.backendCheckPromise) return state.backendCheckPromise;
    state.backendCheckPromise = detectBackend();
    return state.backendCheckPromise;
  }

  async function detectBackend() {
    if (forcedFallback) {
      state.backendChecked = true;
      setBackendMode("fallback", "Local fallback forced by query string.");
      return false;
    }

    if (navigator.onLine === false) {
      state.backendChecked = true;
      setBackendMode("fallback", "Browser reports offline; using local fallback.");
      return false;
    }

    let lastError = null;
    for (const candidate of apiCandidates) {
      try {
        const checked = await checkHealthCandidate(candidate);
        const health = checked.health;
        state.apiBase = checked.base;
        state.backendChecked = true;
        setBackendMode("backend", describeHealth(health, checked.base), health);
        return true;
      } catch (error) {
        lastError = error;
      }
    }

    state.backendChecked = true;
    const reason = isOfflineError(lastError || new Error("Backend unavailable"))
      ? "Backend not reachable; using local fallback."
      : `Backend health check failed (${lastError.status || lastError.message}).`;
    setBackendMode("fallback", reason);
    return false;
  }

  async function checkHealthCandidate(candidate) {
    try {
      return {
        base: candidate,
        health: await requestJson("/health", { method: "GET" }, { base: candidate, timeout: 1800 })
      };
    } catch (error) {
      if (error.status !== 404) throw error;
      const apiBase = stripTrailingSlash(candidate ? `${candidate}/api` : "/api");
      return {
        base: apiBase,
        health: await requestJson("/health", { method: "GET" }, { base: apiBase, timeout: 1800 })
      };
    }
  }

  function describeHealth(health, base) {
    if (!health || typeof health !== "object") return `Connected to ${base || "same-origin"} backend.`;
    const mode = health.deployment_mode || health.deploy_mode || health.mode;
    const corpus = health.corpusVersion || health.corpus_version || health.corpus || "corpus";
    return `Connected to ${base || "same-origin"} backend${mode ? ` (${mode})` : ""}; ${corpus} ready.`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  }

  function formatPercent(value) {
    return `${value.toFixed(2)}%`;
  }

  function getSelectedCase() {
    return data.liveCases.find((item) => item.id === state.selectedCaseId) || data.liveCases[0];
  }

  function getCountedIntervals(item) {
    return item.intervals.map((interval) => {
      let counts = true;
      let reason = "Carrier-responsible downtime counts against SLA.";

      if (interval.tag === "scheduled maintenance" && interval.notice === "customer approved") {
        counts = false;
        reason = "Customer-approved maintenance is excluded.";
      }

      if (interval.tag === "customer-caused" && interval.notice === "unclear") {
        counts = false;
        reason = "Conflicting evidence stays in human review.";
      }

      if (interval.tag === "scheduled maintenance" && interval.notice === "missing") {
        counts = true;
        reason = "Maintenance label counts because required 5-day notice is missing.";
      }

      return {
        ...interval,
        counts,
        reason
      };
    });
  }

  function getCaseCredit(item) {
    const counted = getCountedIntervals(item);
    const countedMinutes = counted
      .filter((interval) => interval.counts)
      .reduce((sum, interval) => sum + interval.minutes, 0);
    const uptime = ((item.periodMinutes - countedMinutes) / item.periodMinutes) * 100;
    const breach = uptime < item.slaTarget;
    const creditPercent = breach ? 0.1 : 0;
    const rawCredit = Math.min(item.mrc * creditPercent, item.mrc);
    const alreadyCredited = item.invoiceHistory.reduce((sum, row) => sum + row.amount, 0);
    const confidence = (
      0.4 * item.retrievalMatch +
      0.4 * item.ambiguityResolution +
      0.2 * item.billingCertainty
    );

    let classification = breach ? "Credit owed" : "Excluded";
    let recoverableAmount = rawCredit;

    if (alreadyCredited > 0) {
      classification = "Already credited";
      recoverableAmount = 0;
    } else if (item.route === "excluded") {
      classification = "Excluded";
      recoverableAmount = 0;
    } else if (confidence < 0.8) {
      classification = "Needs review";
      recoverableAmount = 0;
    } else if (item.claimDaysLeft <= 3 && rawCredit > 0) {
      classification = "Deadline expiring";
    }

    return {
      counted,
      countedMinutes,
      uptime,
      breach,
      creditPercent,
      rawCredit,
      alreadyCredited,
      recoverableAmount,
      confidence,
      classification
    };
  }

  function getPlan(item) {
    const hasAmbiguous = item.intervals.some((interval) => (
      interval.tag === "scheduled maintenance" ||
      interval.tag === "customer-caused"
    ));
    const hasPriorCredit = item.invoiceHistory.length > 0;
    const needsReview = item.route === "needs review";
    const needsBilling = hasPriorCredit || item.route === "already credited";
    const needsExclusion = hasAmbiguous || needsReview;
    const selectedStages = [
      "retrieve outage records",
      "calculate uptime",
      "retrieve SLA tier",
      needsExclusion ? "retrieve exclusion clause" : "skip exclusion clause",
      needsBilling ? "cross-check invoice history" : "skip invoice cross-check",
      "check filing deadline",
      "assemble memo"
    ];

    return {
      needsExclusion,
      needsBilling,
      selectedStages,
      evidence: [
        `${item.id}`,
        `BAN ${item.ban}`,
        `MRC ${formatCurrency(item.mrc)}`,
        `Ticket ${item.intervals[0].ticket}`,
        `${item.claimDaysLeft} days left`
      ],
      rationale: item.plannerHint,
      stopCondition: needsReview
        ? "Stop at Needs review if ambiguity remains unresolved."
        : "Stop when memo has amount, citations, confidence terms, and approval state."
    };
  }

  function getTrace(item) {
    const plan = getPlan(item);
    const credit = getCaseCredit(item);
    const ticketList = item.intervals.map((interval) => interval.ticket).join(", ");
    const stageReason = plan.selectedStages.join(" | ");
    const events = [
      {
        id: "plan",
        kind: "model",
        title: "Plan completed",
        status: "strategy",
        detail: `${plan.rationale} Selected stages: ${stageReason}.`,
        metric: plan.evidence.join(" / ")
      },
      {
        id: "retrieve-logs",
        kind: "retrieval",
        title: "Outage records retrieved",
        status: "source",
        detail: `Matched ${ticketList} to ${item.id} and BAN ${item.ban}.`,
        metric: `${item.intervals.reduce((sum, interval) => sum + interval.minutes, 0)} raw outage minutes`
      },
      {
        id: "uptime",
        kind: "tool",
        title: "Uptime calculated",
        status: "deterministic",
        detail: `uptime_calculator counted ${credit.countedMinutes} minutes against the ${item.invoiceMonth} SLA period.`,
        metric: `${formatPercent(credit.uptime)} actual vs ${item.slaTarget}% target`
      },
      {
        id: "tier",
        kind: "retrieval",
        title: "SLA tier retrieved",
        status: "citation",
        detail: "Matched the availability tier and MRC cap from the MSA service-level exhibit.",
        metric: `${Math.round(credit.creditPercent * 100)}% of MRC when monthly availability is below 99.9%`,
        citationIds: ["sla-tier"]
      }
    ];

    if (plan.needsExclusion) {
      const interval = credit.counted[0];
      events.push({
        id: "exclusion",
        kind: "retrieval",
        title: "Exclusion clause retrieved",
        status: interval.counts ? "counts" : "excluded",
        detail: interval.reason,
        metric: `${interval.ticket}: ${interval.minutes} minutes, ${interval.tag}`,
        citationIds: ["maintenance-notice"]
      });
    } else {
      events.push({
        id: "exclusion-skip",
        kind: "skip",
        title: "Exclusion review skipped",
        status: "skipped",
        detail: "Planner found no maintenance, force-majeure, or customer-caused interval.",
        metric: "No second retrieval needed"
      });
    }

    events.push({
      id: "credit",
      kind: "tool",
      title: "Credit recalculated",
      status: "deterministic",
      detail: `credit_calculator used counted downtime, SLA tier, MRC, and cap. The model did not emit the dollar amount.`,
      metric: `${formatCurrency(credit.rawCredit)} gross service credit`
    });

    if (plan.needsBilling) {
      events.push({
        id: "billing",
        kind: "tool",
        title: "Invoice history cross-checked",
        status: "safe",
        detail: `billing_crosscheck found ${formatCurrency(credit.alreadyCredited)} already issued for ${item.invoiceMonth}.`,
        metric: credit.alreadyCredited > 0 ? "Do not double count" : "No prior credit found",
        citationIds: credit.alreadyCredited > 0 ? ["invoice-credit"] : []
      });
    } else {
      events.push({
        id: "billing-skip",
        kind: "skip",
        title: "Billing cross-check skipped",
        status: "skipped",
        detail: "Planner found complete invoice history with no prior-credit markers.",
        metric: "Skip reason recorded in audit trace"
      });
    }

    events.push({
      id: "deadline",
      kind: "tool",
      title: "Claim deadline checked",
      status: item.claimDaysLeft <= 3 ? "urgent" : "clear",
      detail: `deadline_check calculated ${item.claimDaysLeft} days left in the claim window.`,
      metric: item.claimDaysLeft <= 3 ? "File now" : "Inside claim window",
      citationIds: ["claim-window"]
    });

    events.push({
      id: "decision",
      kind: "decision",
      title: "Case classified",
      status: credit.classification.toLowerCase().replace(/\s+/g, "-"),
      detail: `classification = ${credit.classification}. confidence_calculator returned ${credit.confidence.toFixed(2)}.`,
      metric: `${formatCurrency(credit.recoverableAmount)} recoverable`
    });

    events.push({
      id: "memo",
      kind: "memo",
      title: "Memo assembled",
      status: "ready",
      detail: "memo_assembler created a carrier-ready packet with account, circuit, ticket IDs, clause citations, amount, and approval state.",
      metric: "Ready for human review"
    });

    const eventNames = {
      plan: "plan.completed",
      "retrieve-logs": "outage_records.retrieved",
      uptime: "uptime.calculated",
      tier: "sla_tier.retrieved",
      exclusion: "exclusion_review.retrieved",
      "exclusion-skip": "exclusion_review.skipped",
      credit: "credit.calculated",
      billing: "billing_crosscheck.completed",
      "billing-skip": "billing_crosscheck.skipped",
      deadline: "deadline.checked",
      decision: "case.classified",
      memo: "memo.assembled"
    };

    return events.map((event, seq) => ({
      ...event,
      seq,
      eventName: eventNames[event.id] || event.id,
      at: `2026-07-04T16:00:${String(seq).padStart(2, "0")}.000Z`
    }));
  }

  async function selectCase(caseId, options) {
    const selectionOptions = options || {};
    if (!liveCaseIds.includes(caseId)) return;

    state.selectedCaseId = caseId;
    const cachedEvents = state.backendEventsByCase.get(caseId);
    const cachedMemo = state.backendMemos.get(caseId);

    if (cachedEvents) {
      state.railEvents = cachedEvents;
    } else if (state.memoReady && state.backendMode !== "backend") {
      state.railEvents = getTrace(getSelectedCase());
    } else if (!state.memoReady) {
      state.railEvents = [];
    }

    if (cachedMemo) {
      state.memo = cachedMemo;
      state.memoReady = true;
    } else if (state.backendMode !== "backend" && state.memoReady) {
      state.memo = null;
    }

    renderAll();

    if (selectionOptions.skipBackend || state.running) return;
    if (await ensureBackendChecked()) {
      try {
        await fetchBackendMemo(caseId, { optional: true });
      } catch (error) {
        handleBackendOperationError(error, "memo fetch");
      }
    }
  }

  function renderQueue() {
    refs.caseList.innerHTML = "";
    allRows.forEach((row) => {
      const status = state.queueStatus.get(row.id) || (row.live ? "ready" : "processed");
      const button = document.createElement("button");
      button.className = `case-row ${row.live ? "case-row--live" : ""} ${row.id === state.selectedCaseId ? "is-selected" : ""}`;
      button.type = "button";
      button.dataset.caseId = row.id;
      button.innerHTML = `
        <span class="case-row-main">
          <strong>${row.id}</strong>
          <span>${row.store}</span>
        </span>
        <span class="case-row-meta">
          <span>BAN ${row.ban}</span>
          <span>${formatCurrency(row.amount)}</span>
        </span>
        <span class="route-line">
          <span class="route-chip route-chip--${slug(row.route)}">${row.route}</span>
          <span class="row-status">${status}</span>
        </span>
      `;
      button.addEventListener("click", () => {
        if (liveCaseIds.includes(row.id)) {
          selectCase(row.id);
        }
      });
      refs.caseList.appendChild(button);
    });
  }

  function renderTabs() {
    refs.caseTabs.innerHTML = "";
    data.liveCases.slice(0, 3).forEach((item) => {
      const tab = document.createElement("button");
      tab.className = `trace-tab ${item.id === state.selectedCaseId ? "is-active" : ""}`;
      tab.type = "button";
      tab.textContent = item.route;
      tab.title = item.id;
      tab.addEventListener("click", () => {
        selectCase(item.id);
      });
      refs.caseTabs.appendChild(tab);
    });
  }

  function renderSpotlight() {
    const item = getSelectedCase();
    const credit = getCaseCredit(item);
    refs.caseSpotlight.innerHTML = `
      <div class="spotlight-grid">
        <div>
          <span>Selected circuit</span>
          <strong>${item.id}</strong>
        </div>
        <div>
          <span>Account</span>
          <strong>BAN ${item.ban}</strong>
        </div>
        <div>
          <span>MRC</span>
          <strong>${formatCurrency(item.mrc)}</strong>
        </div>
        <div>
          <span>Ticket</span>
          <strong>${item.intervals[0].ticket}</strong>
        </div>
        <div>
          <span>Counted downtime</span>
          <strong>${credit.countedMinutes} min</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>${credit.confidence.toFixed(2)}</strong>
        </div>
      </div>
    `;
  }

  function renderProofStrip(active) {
    const items = refs.proofStrip.querySelectorAll("article");
    items.forEach((item, index) => {
      item.classList.toggle("is-lit", active === index);
    });
  }

  function renderRail() {
    refs.railList.innerHTML = "";
    if (!state.railEvents.length) {
      const item = getSelectedCase();
      const credit = getCaseCredit(item);
      refs.railList.innerHTML = `
        <div class="preflight-card">
          <div class="preflight-head">
            <span>Audit preflight</span>
            <strong>${escapeHtml(item.id)}</strong>
          </div>
          <div class="preflight-grid">
            <div>
              <span>Planner route</span>
              <strong>${escapeHtml(item.route)}</strong>
            </div>
            <div>
              <span>Downtime sample</span>
              <strong>${credit.countedMinutes} min</strong>
            </div>
            <div>
              <span>Claim window</span>
              <strong>${item.claimDaysLeft} days</strong>
            </div>
            <div>
              <span>Confidence floor</span>
              <strong>${credit.confidence.toFixed(2)}</strong>
            </div>
          </div>
          <div class="preflight-path">
            <span>Expected evidence path</span>
            <ol>
              <li>Outage records</li>
              <li>SLA tier</li>
              <li>${getPlan(item).needsExclusion ? "Maintenance exclusion clause" : "Exclusion review skipped"}</li>
              <li>Deadline and memo packet</li>
            </ol>
          </div>
        </div>
      `;
      return;
    }

    state.railEvents.forEach((event, index) => {
      const card = document.createElement("article");
      card.className = `rail-card rail-card--${event.kind}`;
      card.style.setProperty("--delay", `${Math.min(index * 30, 240)}ms`);
      card.innerHTML = `
        <div class="rail-stem" aria-hidden="true"></div>
        <div class="rail-card-top">
          <span class="event-icon event-icon--${event.kind}" aria-hidden="true"></span>
          <div>
            <p>${escapeHtml(event.eventName || event.kind)}</p>
            <h3>${escapeHtml(event.title)}</h3>
          </div>
          <span class="event-status event-status--${slug(event.status)}">${escapeHtml(event.status)}</span>
        </div>
        <p class="rail-detail">${escapeHtml(event.detail)}</p>
        <div class="rail-card-foot">
          <strong>${escapeHtml(event.metric)}</strong>
          <div class="citation-chips">
            ${(event.citationIds || []).map((id) => citationChip(id)).join("")}
          </div>
        </div>
      `;
      refs.railList.appendChild(card);
    });
  }

  function citationChip(id) {
    const doc = getCitationDoc(id);
    if (!doc) return "";
    return `<button class="citation-chip" type="button" data-citation="${escapeHtml(id)}">${escapeHtml(doc.page || doc.title || id)}</button>`;
  }

  function buildLocalMemo(item) {
    const plan = getPlan(item);
    const credit = getCaseCredit(item);
    return {
      caseId: item.id,
      store: item.store,
      carrier: item.carrier,
      ban: item.ban,
      circuit: item.id,
      invoiceMonth: item.invoiceMonth,
      mrc: item.mrc,
      tickets: item.intervals.map((row) => row.ticket),
      amount: credit.recoverableAmount,
      totalRecovery: data.targetRecovery,
      availability: `${formatPercent(credit.uptime)} actual vs ${item.slaTarget}% target`,
      exclusionDecision: credit.counted[0].reason,
      deadline: `${item.claimDaysLeft} days left to file`,
      confidenceLabel: `${credit.confidence.toFixed(2)} = 0.4 retrieval (${item.retrievalMatch.toFixed(2)}) + 0.4 ambiguity (${item.ambiguityResolution.toFixed(2)}) + 0.2 billing (${item.billingCertainty.toFixed(2)})`,
      classification: credit.classification,
      citations: {
        availability: "sla-tier",
        exclusion: plan.needsExclusion ? "maintenance-notice" : "",
        deadline: "claim-window"
      },
      source: "local"
    };
  }

  function renderMemo() {
    if (!state.memoReady) {
      const item = getSelectedCase();
      const credit = getCaseCredit(item);
      refs.memoStatus.textContent = "Waiting";
      refs.memoStatus.className = "mini-stat mini-stat--amber";
      refs.memoBody.innerHTML = `
        <div class="memo-placeholder">
          <div class="memo-placeholder-header">
            <div>
              <span>Draft packet</span>
              <strong>${escapeHtml(item.store)}</strong>
            </div>
            <b>${formatCurrency(credit.recoverableAmount)}</b>
          </div>
          <div class="memo-placeholder-lines">
            <div><span>Carrier</span><strong>${escapeHtml(item.carrier)}</strong></div>
            <div><span>Circuit</span><strong>${escapeHtml(item.id)}</strong></div>
            <div><span>Ticket</span><strong>${escapeHtml(item.intervals[0].ticket)}</strong></div>
            <div><span>Status</span><strong>Awaiting evidence</strong></div>
          </div>
          <div class="memo-placeholder-note">
            <span>Human approval remains locked until the trace assembles citations and deterministic math.</span>
          </div>
        </div>
      `;
      return;
    }

    const item = getSelectedCase();
    const memo = state.memo && state.memo.caseId === state.selectedCaseId
      ? state.memo
      : buildLocalMemo(item);
    const approval = state.approval || memo.approval || null;
    const approved = state.approved || approval?.action === "approve";

    refs.memoStatus.textContent = approved ? "Approved" : memo.classification;
    refs.memoStatus.className = `mini-stat ${approved ? "mini-stat--green" : "mini-stat--amber"}`;
    refs.memoBody.innerHTML = `
      <article class="memo-card ${approved ? "memo-card--approved" : ""}">
        <div class="memo-card-header">
          <div>
            <p>Service-credit claim packet</p>
            <h3>${escapeHtml(memo.store)}</h3>
          </div>
          <strong>${formatCurrency(Number(memo.amount) || 0)}</strong>
        </div>

        <dl class="memo-grid">
          <div><dt>Carrier</dt><dd>${escapeHtml(memo.carrier)}</dd></div>
          <div><dt>BAN</dt><dd>${escapeHtml(memo.ban)}</dd></div>
          <div><dt>Circuit</dt><dd>${escapeHtml(memo.circuit)}</dd></div>
          <div><dt>Invoice month</dt><dd>${escapeHtml(memo.invoiceMonth)}</dd></div>
          <div><dt>MRC</dt><dd>${formatCurrency(Number(memo.mrc) || 0)}</dd></div>
          <div><dt>Tickets</dt><dd>${escapeHtml((memo.tickets || []).join(", "))}</dd></div>
        </dl>

        <div class="memo-line">
          <span>Availability</span>
          <strong>${escapeHtml(memo.availability)}</strong>
          ${citationChip(memo.citations.availability)}
        </div>
        <div class="memo-line">
          <span>Exclusion decision</span>
          <strong>${escapeHtml(memo.exclusionDecision)}</strong>
          ${memo.citations.exclusion ? citationChip(memo.citations.exclusion) : ""}
        </div>
        <div class="memo-line">
          <span>Deadline</span>
          <strong>${escapeHtml(memo.deadline)}</strong>
          ${citationChip(memo.citations.deadline)}
        </div>
        <div class="memo-line">
          <span>Confidence</span>
          <strong>${escapeHtml(memo.confidenceLabel)}</strong>
        </div>
        <div class="memo-line memo-line--total">
          <span>Classification</span>
          <strong>${escapeHtml(memo.classification)}</strong>
        </div>
      </article>

      <div class="memo-queue">
        <div>
          <span>Ranked queue</span>
          <strong>Top claims ready after audit</strong>
        </div>
        ${allRows.filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5).map((row, index) => `
          <button class="queue-memo-row" type="button" data-case-id="${row.id}">
            <span>${index + 1}. ${row.id}</span>
            <strong>${formatCurrency(row.amount)}</strong>
          </button>
        `).join("")}
      </div>
      ${approval ? `
        <div class="approval-history">
          <span>${approval.action === "approve" ? "Approval recorded" : "Override recorded"}</span>
          <strong>${escapeHtml(approval.reason)}</strong>
          <p>${escapeHtml(approval.eventName || "human_approval.recorded")} at ${escapeHtml(approval.timestamp)}</p>
        </div>
      ` : ""}
    `;
  }

  function renderAll() {
    renderTransportLabels();
    renderQueue();
    renderTabs();
    renderSpotlight();
    renderRail();
    renderMemo();
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function animateCounter(target, duration) {
    const start = state.currentTotal;
    const delta = target - start;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      state.currentTotal = Math.round(start + delta * eased);
      refs.moneyCounter.textContent = formatCurrency(state.currentTotal);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function startTimer() {
    state.timerStartedAt = Date.now();
    clearInterval(state.timerHandle);
    state.timerHandle = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.timerStartedAt) / 1000);
      const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const seconds = String(elapsed % 60).padStart(2, "0");
      refs.runTimer.textContent = `${minutes}:${seconds}`;
    }, 250);
  }

  function stopTimer(finalText) {
    clearInterval(state.timerHandle);
    refs.runTimer.textContent = finalText || refs.runTimer.textContent;
  }

  async function runAudit(mode) {
    if (state.running) return;
    if (mode === "replay") {
      await runLocalAudit("replay");
      return;
    }

    if (await ensureBackendChecked()) {
      await runBackendAudit();
      return;
    }

    await runLocalAudit("fallback");
  }

  async function runBackendAudit() {
    if (state.running) return;

    const caseId = state.selectedCaseId || liveCaseIds[0];
    let handedToFallback = false;

    state.running = true;
    state.approved = false;
    state.memoReady = false;
    state.traceMode = "backend";
    state.currentTotal = 0;
    state.railEvents = [];
    state.memo = null;
    state.queueStatus.clear();
    state.approval = null;
    refs.moneyCounter.textContent = "$0";
    refs.moneyCounter.parentElement.classList.remove("is-approved");
    refs.formError.textContent = "";
    refs.approvalReason.value = "";
    refs.runButton.disabled = true;
    refs.replayButton.disabled = true;
    setBackendMode("backend", state.backendReason || "Streaming from the live backend.");
    startTimer();

    data.liveCases.slice(0, 3).forEach((item) => {
      state.queueStatus.set(item.id, item.id === caseId ? "starting" : "queued");
    });
    renderAll();

    try {
      await startBackendRun(caseId);
      state.queueStatus.set(caseId, "streaming");
      renderQueue();
      await streamBackendEvents(caseId);
      await fetchBackendMemo(caseId);
      const memo = state.memo || buildLocalMemo(getSelectedCase());
      const total = Number(memo.totalRecovery) || data.targetRecovery;
      animateCounter(total, 900);
      await sleep(950);
      state.currentTotal = total;
      refs.moneyCounter.textContent = formatCurrency(total);
      state.queueStatus.set(caseId, "memo ready");
      stopTimer();
      setBackendMode("backend", "Live backend run completed.");
    } catch (error) {
      closeBackendStream();
      if (isOfflineError(error)) {
        handedToFallback = true;
        state.running = false;
        refs.runButton.disabled = false;
        refs.replayButton.disabled = false;
        setBackendMode("fallback", `Backend stream unavailable (${error.message || "network error"}); using local fallback.`);
        await runLocalAudit("fallback");
        return;
      }

      handleBackendOperationError(error, "audit run");
      stopTimer("error");
    } finally {
      if (!handedToFallback) {
        state.running = false;
        refs.runButton.disabled = false;
        refs.replayButton.disabled = false;
        closeBackendStream();
        renderAll();
      }
    }
  }

  async function startBackendRun(caseId) {
    const body = {
      case_id: caseId,
      case_ids: data.liveCases.slice(0, 3).map((item) => item.id),
      source: "reclaim-frontend"
    };

    try {
      await requestJson("/run-portfolio", {
        method: "POST",
        body: JSON.stringify(body)
      });
    } catch (error) {
      if (error.status !== 404 && error.status !== 405) throw error;
      await requestJson(`/cases/${encodeURIComponent(caseId)}/run`, {
        method: "POST",
        body: JSON.stringify(body)
      });
    }
  }

  function streamBackendEvents(caseId) {
    closeBackendStream();

    return new Promise((resolve, reject) => {
      let sawEvents = false;
      let finished = false;
      const eventTypes = [
        "plan.completed",
        "outage_records.retrieved",
        "uptime.calculated",
        "sla_tier.retrieved",
        "exclusion_review.retrieved",
        "exclusion_review.skipped",
        "credit.calculated",
        "billing_crosscheck.completed",
        "billing_crosscheck.skipped",
        "deadline.checked",
        "case.classified",
        "memo.assembled",
        "human_approval.recorded",
        "done"
      ];

      function finish() {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        closeBackendStream();
        state.backendEventsByCase.set(caseId, [...state.railEvents]);
        resolve();
      }

      function fail(error) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        closeBackendStream();
        reject(error);
      }

      const timeout = window.setTimeout(() => {
        if (sawEvents) {
          finish();
        } else {
          fail(new Error("Timed out waiting for backend SSE events"));
        }
      }, 15000);

      function ingest(raw, eventName) {
        sawEvents = true;
        const payload = parseSsePayload(raw);
        if (payload.done) {
          window.clearTimeout(timeout);
          finish();
          return;
        }

        const event = normalizeBackendEvent(payload, eventName);
        rememberCitations(payload);
        state.railEvents.push(event);
        state.backendEventsByCase.set(caseId, [...state.railEvents]);

        if (/memo\.assembled|memo/i.test(event.eventName || event.id)) {
          state.memoReady = true;
          window.clearTimeout(timeout);
          window.setTimeout(finish, 250);
        }

        renderAll();
      }

      try {
        state.stream = new EventSource(apiUrl(`/cases/${encodeURIComponent(caseId)}/events`));
        state.stream.onmessage = (event) => ingest(event.data, event.type);
        eventTypes.forEach((eventType) => {
          state.stream.addEventListener(eventType, (event) => ingest(event.data, eventType));
        });
        state.stream.onerror = () => {
          window.clearTimeout(timeout);
          if (sawEvents) finish();
          else fail(new Error("Could not open backend event stream"));
        };
      } catch (error) {
        window.clearTimeout(timeout);
        fail(error);
      }
    });
  }

  function closeBackendStream() {
    if (state.stream) {
      state.stream.close();
      state.stream = null;
    }
  }

  function parseSsePayload(raw) {
    if (raw === "[DONE]" || raw === "done") return { done: true };
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { message: raw };
    }
  }

  async function fetchBackendMemo(caseId, options) {
    const memoOptions = options || {};
    try {
      const payload = await requestJson(`/cases/${encodeURIComponent(caseId)}/memo`, { method: "GET" });
      rememberCitations(payload);
      const memo = normalizeBackendMemo(payload, caseId);
      state.memo = memo;
      state.backendMemos.set(caseId, memo);
      state.memoReady = true;
      renderAll();
      return memo;
    } catch (error) {
      if (memoOptions.optional && error.status === 404) return null;
      throw error;
    }
  }

  function normalizeBackendEvent(payload, eventName) {
    const source = payload.event || payload.audit_event || payload;
    const stage = source.eventName || source.event_name || source.stage || source.name || eventName || "backend.event";
    const citationIds = extractCitationIds(source);
    const detail = source.detail || source.output_summary || source.message || source.summary || source.skipped_reason || compactValue(source.output) || "Backend event received.";
    const metric = source.metric || source.inputs_summary || source.input_summary || compactValue(source.metric_json) || compactValue(source.inputs) || "Persisted audit event";
    const status = source.status || source.classification || inferBackendStatus(stage, source);

    return {
      id: source.id || source.event_id || slug(stage),
      kind: source.kind || inferBackendKind(stage),
      title: source.title || titleFromEventName(stage),
      status,
      detail,
      metric,
      citationIds,
      eventName: stage,
      at: source.at || source.timestamp || new Date().toISOString()
    };
  }

  function normalizeBackendMemo(payload, caseId) {
    const source = payload.memo || payload.packet || payload;
    const item = data.liveCases.find((candidate) => candidate.id === (source.case_id || source.caseId || caseId)) || getSelectedCase();
    const local = buildLocalMemo(item);
    const confidenceTerms = source.confidence_terms || source.confidenceTerms || source.confidence || {};
    const citations = {
      ...local.citations,
      ...extractMemoCitations(source)
    };
    const approval = normalizeApproval(source.approval || source.approval_history?.[0] || payload.approval);

    return {
      ...local,
      caseId: source.case_id || source.caseId || source.circuit_id || source.circuitId || local.caseId,
      store: source.store || source.store_name || source.storeName || local.store,
      carrier: source.carrier || local.carrier,
      ban: source.ban || source.account || local.ban,
      circuit: source.circuit || source.circuit_id || source.circuitId || local.circuit,
      invoiceMonth: source.invoice_month || source.invoiceMonth || source.period || local.invoiceMonth,
      mrc: firstNumber(source.mrc, source.monthly_recurring_charge, source.monthlyRecurringCharge, local.mrc),
      tickets: source.tickets || source.ticket_ids || source.ticketIds || local.tickets,
      amount: firstNumber(source.recoverable_amount, source.recoverableAmount, source.memo_amount, source.memoAmount, source.credit_amount, source.creditAmount, source.amount, local.amount),
      totalRecovery: firstNumber(source.portfolio_total, source.portfolioTotal, source.recoverable_total, source.recoverableTotal, payload.recoverable_total, local.totalRecovery),
      availability: source.availability || source.availability_label || source.availabilityLabel || local.availability,
      exclusionDecision: source.exclusion_decision || source.exclusionDecision || source.exclusion?.decision || local.exclusionDecision,
      deadline: source.deadline || source.deadline_label || source.deadlineLabel || source.claim_window || local.deadline,
      confidenceLabel: source.confidence_label || source.confidenceLabel || formatConfidenceTerms(confidenceTerms, local.confidenceLabel),
      classification: source.classification || source.status || local.classification,
      citations,
      approval,
      source: "backend"
    };
  }

  function normalizeApproval(payload) {
    if (!payload) return null;
    return {
      action: payload.action || payload.decision || "approve",
      reason: payload.reason || payload.note || "",
      timestamp: payload.timestamp || payload.at || new Date().toISOString(),
      eventName: payload.eventName || payload.event_name || "human_approval.recorded",
      source: payload.source || "backend"
    };
  }

  function inferBackendKind(stage) {
    if (/plan/i.test(stage)) return "model";
    if (/retriev|citation|clause|outage/i.test(stage)) return "retrieval";
    if (/skip/i.test(stage)) return "skip";
    if (/classif|decision/i.test(stage)) return "decision";
    if (/memo/i.test(stage)) return "memo";
    return "tool";
  }

  function inferBackendStatus(stage, source) {
    if (/skip/i.test(stage) || source.skipped_reason) return "skipped";
    if (/retriev|citation|clause/i.test(stage)) return "source";
    if (/deadline/i.test(stage)) return "clear";
    if (/memo/i.test(stage)) return "ready";
    if (/classif|decision/i.test(stage)) return "decision";
    return "deterministic";
  }

  function titleFromEventName(value) {
    return String(value || "Backend event")
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function firstNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  }

  function formatConfidenceTerms(terms, fallback) {
    if (!terms || typeof terms !== "object") return String(terms || fallback);
    const score = terms.score ?? terms.value ?? terms.total;
    const retrieval = terms.retrieval ?? terms.retrieval_match;
    const ambiguity = terms.ambiguity ?? terms.ambiguity_resolution;
    const billing = terms.billing ?? terms.billing_certainty;
    if ([score, retrieval, ambiguity, billing].every((value) => value !== undefined)) {
      return `${Number(score).toFixed(2)} = 0.4 retrieval (${Number(retrieval).toFixed(2)}) + 0.4 ambiguity (${Number(ambiguity).toFixed(2)}) + 0.2 billing (${Number(billing).toFixed(2)})`;
    }
    return compactValue(terms) || fallback;
  }

  function compactValue(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value !== "object") return String(value);
    return Object.entries(value)
      .slice(0, 4)
      .map(([key, item]) => `${key}: ${typeof item === "object" ? JSON.stringify(item) : item}`)
      .join(" / ");
  }

  function extractCitationIds(source) {
    const citations = source.citationIds || source.citation_ids || source.citations || source.citation_refs || [];
    return citations.map((citation) => {
      if (typeof citation === "string") return citation;
      return citation.id || citation.citation_id || citation.clause_key || citation.doc_id || citation.key || citation.page;
    }).filter(Boolean);
  }

  function extractMemoCitations(source) {
    const citationMap = {};
    const fields = source.citations || source.citation_map || source.citationMap || {};
    if (Array.isArray(fields)) {
      fields.forEach((citation) => {
        const id = rememberCitation(citation);
        const key = citation.memo_line || citation.line || citation.kind || citation.supports;
        if (key && id) citationMap[normalizeCitationLine(key)] = id;
      });
      return citationMap;
    }

    Object.entries(fields).forEach(([key, value]) => {
      citationMap[normalizeCitationLine(key)] = typeof value === "string" ? value : rememberCitation(value);
    });
    return citationMap;
  }

  function normalizeCitationLine(key) {
    if (/avail|sla|tier/i.test(key)) return "availability";
    if (/excl|maint/i.test(key)) return "exclusion";
    if (/deadline|claim/i.test(key)) return "deadline";
    return key;
  }

  function rememberCitations(payload) {
    if (!payload || typeof payload !== "object") return;
    const source = payload.memo || payload.packet || payload.event || payload.audit_event || payload;
    const collections = [
      source.citations,
      source.citation_map,
      source.citationMap,
      payload.citations
    ].filter(Boolean);

    collections.forEach((collection) => {
      if (Array.isArray(collection)) {
        collection.forEach(rememberCitation);
      } else {
        Object.values(collection).forEach(rememberCitation);
      }
    });
  }

  function rememberCitation(citation) {
    if (!citation || typeof citation !== "object") return citation;
    const id = citation.id || citation.citation_id || citation.clause_key || citation.doc_id || citation.key || citation.page;
    if (!id) return "";
    state.citations.set(id, {
      title: citation.title || citation.document || citation.doc_title || citation.doc_id || id,
      page: citation.page || citation.section || citation.location || id,
      asset: citation.asset || citation.highlight_asset_path || citation.highlightAssetPath || citation.image || "",
      excerpt: citation.excerpt || citation.text || citation.quote || ""
    });
    return id;
  }

  function getCitationDoc(id) {
    if (!id) return null;
    return state.citations.get(id) || data.documents[id] || null;
  }

  function handleBackendOperationError(error, context) {
    const message = error.status
      ? `${context} failed with HTTP ${error.status}.`
      : `${context} failed: ${error.message || "backend error"}.`;
    refs.formError.textContent = message;
    setBackendMode("error", message);
    const failureEvent = {
      id: `backend-error-${Date.now()}`,
      kind: "decision",
      title: "Backend operation failed",
      status: "needs review",
      detail: message,
      metric: error.bodyText ? error.bodyText.slice(0, 120) : "Check API logs",
      eventName: "backend.error",
      at: new Date().toISOString()
    };
    state.railEvents.push(failureEvent);
    renderAll();
  }

  async function runLocalAudit(mode) {
    if (state.running) return;

    state.running = true;
    state.approved = false;
    state.memoReady = false;
    state.traceMode = mode || "live";
    setBackendMode(mode === "replay" ? "replay" : "fallback", mode === "replay" ? "Replaying the saved golden trace." : state.backendReason || "Using local fallback trace.");
    state.currentTotal = 0;
    state.railEvents = [];
    state.memo = null;
    state.queueStatus.clear();
    state.approval = null;
    refs.moneyCounter.textContent = "$0";
    refs.moneyCounter.parentElement.classList.remove("is-approved");
    refs.formError.textContent = "";
    refs.approvalReason.value = "";
    refs.runButton.disabled = true;
    refs.replayButton.disabled = true;
    startTimer();
    renderAll();

    data.liveCases.slice(0, 3).forEach((item, index) => {
      state.queueStatus.set(item.id, index === 0 ? "planning" : "queued");
    });
    renderQueue();
    renderProofStrip(null);
    await sleep(mode === "replay" ? 200 : 550);

    renderProofStrip(0);
    state.queueStatus.set("CKT-SEA-009", "skip - clean");
    renderQueue();
    await sleep(mode === "replay" ? 180 : 700);

    renderProofStrip(1);
    state.selectedCaseId = "CKT-ATL-014";
    state.queueStatus.set("CKT-ATL-014", "deep review");
    state.queueStatus.set("CKT-DEN-031", "billing check");
    renderAll();
    await streamTrace(getSelectedCase(), mode === "replay");

    renderProofStrip(2);
    state.queueStatus.set("CKT-DEN-031", "already credited");
    state.queueStatus.set("CKT-PHX-022", "deadline expiring");
    state.queueStatus.set("CKT-MIA-020", "excluded");
    state.queueStatus.set("CKT-BOS-018", "needs review");
    renderQueue();
    await sleep(mode === "replay" ? 200 : 550);

    state.memoReady = true;
    animateCounter(data.targetRecovery, mode === "replay" ? 500 : 1500);
    await sleep(mode === "replay" ? 550 : 1600);
    state.currentTotal = data.targetRecovery;
    refs.moneyCounter.textContent = formatCurrency(data.targetRecovery);
    stopTimer(mode === "replay" ? "trace" : "00:12");
    state.running = false;
    refs.runButton.disabled = false;
    refs.replayButton.disabled = false;
    renderAll();
  }

  async function streamTrace(item, fast) {
    const events = getTrace(item);
    state.railEvents = [];
    renderRail();
    for (let index = 0; index < events.length; index += 1) {
      state.railEvents.push(events[index]);
      if (events[index].id === "credit") {
        const credit = getCaseCredit(item);
        animateCounter(Math.max(state.currentTotal, credit.recoverableAmount), fast ? 180 : 500);
      }
      if (events[index].id === "memo") {
        state.memoReady = true;
      }
      renderAll();
      await sleep(fast ? 120 : 560);
    }
  }

  function openCitation(id) {
    const doc = getCitationDoc(id);
    if (!doc) {
      refs.drawerBody.innerHTML = `
        <dl>
          <div><dt>Citation</dt><dd>${escapeHtml(id)}</dd></div>
          <div><dt>Status</dt><dd>Metadata has not arrived from the backend yet.</dd></div>
        </dl>
      `;
      refs.citationDrawer.classList.add("is-open");
      refs.citationDrawer.setAttribute("aria-hidden", "false");
      return;
    }
    refs.drawerBody.innerHTML = `
      ${doc.asset ? `<img src="${escapeHtml(doc.asset)}" alt="Highlighted source clause from ${escapeHtml(doc.title)}">` : ""}
      <dl>
        <div><dt>Document</dt><dd>${escapeHtml(doc.title)}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(doc.page)}</dd></div>
        <div><dt>Cited text</dt><dd>${escapeHtml(doc.excerpt || "Citation text provided by backend.")}</dd></div>
      </dl>
    `;
    refs.citationDrawer.classList.add("is-open");
    refs.citationDrawer.setAttribute("aria-hidden", "false");
  }

  function closeCitation() {
    refs.citationDrawer.classList.remove("is-open");
    refs.citationDrawer.setAttribute("aria-hidden", "true");
  }

  async function handleApproval(action) {
    const reason = refs.approvalReason.value.trim();
    const item = getSelectedCase();
    const credit = getCaseCredit(item);
    const blocker = getApprovalBlocker(credit);

    if (!state.memoReady) {
      refs.formError.textContent = "Run the audit before approving a memo.";
      return;
    }
    if (action === "approve" && blocker) {
      refs.formError.textContent = blocker;
      return;
    }
    if (!reason) {
      refs.formError.textContent = "Typed reason required for the audit trail.";
      refs.approvalReason.focus();
      return;
    }

    if (await ensureBackendChecked()) {
      try {
        const payload = await requestJson(`/cases/${encodeURIComponent(state.selectedCaseId)}/approve`, {
          method: "POST",
          body: JSON.stringify({
            action,
            reason,
            approver: "Priya Shah",
            case_id: state.selectedCaseId
          })
        });
        const approval = normalizeApproval(payload?.approval || payload || {
          action,
          reason,
          timestamp: new Date().toISOString()
        });
        recordApproval(action, reason, approval);
        state.approval.source = "backend";
        setBackendMode("backend", "Approval recorded through backend POST.");
        return;
      } catch (error) {
        if (!isOfflineError(error)) {
          refs.formError.textContent = error.status
            ? `Approval POST failed with HTTP ${error.status}.`
            : `Approval POST failed: ${error.message || "backend error"}.`;
          setBackendMode("error", refs.formError.textContent);
          return;
        }
        setBackendMode("fallback", "Approval POST could not reach the backend; recording local fallback approval.");
      }
    }

    recordApproval(action, reason);
  }

  function recordApproval(action, reason, backendApproval) {
    refs.formError.textContent = "";
    state.approved = action === "approve";
    state.approval = backendApproval || {
      action,
      reason,
      timestamp: state.backendMode === "backend" ? new Date().toISOString() : "2026-07-04T16:00:14.000Z",
      eventName: "human_approval.recorded",
      source: state.backendMode === "backend" ? "backend" : "local"
    };
    if (state.memo) state.memo.approval = state.approval;
    refs.moneyCounter.parentElement.classList.toggle("is-approved", state.approved);
    refs.memoStatus.textContent = state.approved ? "Approved" : "Override saved";
    refs.memoStatus.className = state.approved ? "mini-stat mini-stat--green" : "mini-stat mini-stat--amber";
    renderMemo();
  }

  function getApprovalBlocker(credit) {
    if (credit.confidence < 0.8) return "Confidence below 0.80 routes this case to Needs review.";
    if (credit.classification === "Already credited") return "Already credited cases cannot be approved for recovery.";
    if (credit.classification === "Excluded") return "Excluded cases require override, not approval.";
    if (credit.classification === "Needs review") return "Needs review cases require override, not approval.";
    return "";
  }

  async function runSmoke() {
    const backendAvailable = await ensureBackendChecked();
    await runAudit("live");
    await selectCase("CKT-SEA-009", { skipBackend: !backendAvailable });
    await selectCase("CKT-ATL-014", { skipBackend: !backendAvailable });
    const trace = getTrace(data.liveCases[0]);
    const cleanTrace = getTrace(data.liveCases[1]);
    const hasTriggeredRetrieval = trace.some((event) => event.eventName === "exclusion_review.retrieved");
    const hasSkippedRetrieval = cleanTrace.some((event) => event.eventName === "exclusion_review.skipped");
    const hasSafetyCase = data.liveCases.some((item) => {
      const classification = getCaseCredit(item).classification;
      return ["Already credited", "Deadline expiring", "Excluded", "Needs review"].includes(classification);
    });

    refs.approvalReason.value = "";
    await handleApproval("approve");
    const blocksBlankApproval = refs.formError.textContent.includes("Typed reason");

    refs.approvalReason.value = "Smoke test: verified deterministic trace and citation receipts.";
    await handleApproval("approve");
    openCitation("sla-tier");
    const citationOpened = refs.citationDrawer.classList.contains("is-open");
    const counterReached = refs.moneyCounter.textContent === formatCurrency(data.targetRecovery);
    const modeVisible = /(Live backend|Local fallback|Golden replay)/.test(refs.modePill?.textContent || "");
    const approvalRecorded = Boolean(state.approval);

    const results = [
      ["triggered exclusion retrieval", hasTriggeredRetrieval],
      ["skipped exclusion retrieval", hasSkippedRetrieval],
      ["safety case present", hasSafetyCase],
      ["blank approval blocked", blocksBlankApproval],
      ["mode label visible", modeVisible],
      ["approval recorded", approvalRecorded],
      ["citation drawer opens", citationOpened],
      ["counter reaches target", counterReached]
    ];
    const passed = results.every(([, ok]) => ok);
    const banner = document.createElement("div");
    banner.className = `smoke-banner ${passed ? "smoke-banner--pass" : "smoke-banner--fail"}`;
    banner.textContent = `${passed ? "Smoke passed" : "Smoke failed"}: ${results.map(([name, ok]) => `${name}=${ok ? "ok" : "fail"}`).join(", ")}`;
    document.body.appendChild(banner);
    window.RECLAIM_SMOKE_RESULT = { passed, results };
  }

  document.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-citation]");
    if (chip) openCitation(chip.dataset.citation);

    const memoRow = event.target.closest(".queue-memo-row");
    if (memoRow && liveCaseIds.includes(memoRow.dataset.caseId)) {
      selectCase(memoRow.dataset.caseId);
    }
  });

  refs.runButton.addEventListener("click", () => runAudit("live"));
  refs.replayButton.addEventListener("click", () => runAudit("replay"));
  refs.drawerClose.addEventListener("click", closeCitation);
  refs.approvalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleApproval("approve");
  });
  refs.overrideButton.addEventListener("click", () => handleApproval("override"));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCitation();
  });

  if (Number.isFinite(Number(data.targetRecovery))) {
    state.currentTotal = Number(data.targetRecovery);
    refs.moneyCounter.textContent = formatCurrency(state.currentTotal);
  }

  renderAll();
  ensureBackendChecked().then(() => {
    renderAll();
    if (query.has("smoke")) {
      window.setTimeout(runSmoke, 120);
    }
  });
})();
