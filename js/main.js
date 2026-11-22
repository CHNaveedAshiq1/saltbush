/* Saltbush Cleaning Co, interactive pricing and booking */
(function(){
"use strict";
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, c) => (c||document).querySelector(s);
const $$ = (s, c) => Array.from((c||document).querySelectorAll(s));
const money = n => "$" + n.toLocaleString("en-AU");
/* interval based animator: reliable even where rAF is starved */
function animate(dur, onUpdate, onDone){
  const t0 = performance.now();
  const iv = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / dur);
    onUpdate(1 - Math.pow(1 - p, 3), p);
    if (p >= 1){ clearInterval(iv); if (onDone) onDone(); }
  }, 20);
}

/* ---------- hero load ring ---------- */
const ring = $("#loadRing"), ringFill = $("#ringFill"), ringNum = $("#ringNum"), booked = $("#bookedCard");
if (ring && ringFill){
  const C = 2 * Math.PI * 52;
  ringFill.style.strokeDasharray = C;
  ringFill.style.strokeDashoffset = C;
  const finish = () => {
    ring.style.transition = "opacity .45s ease";
    ring.style.opacity = "0";
    setTimeout(() => { ring.hidden = true; }, 480);
    if (booked) booked.hidden = false;
  };
  if (REDUCED){
    ring.hidden = true;
    if (booked) booked.hidden = false;
  } else {
    animate(2100, eased => {
      ringNum.textContent = Math.round(eased * 100) + "%";
      ringFill.style.strokeDashoffset = C * (1 - eased);
    }, finish);
    setTimeout(() => { if (!ring.hidden) finish(); }, 4000);
  }
}

/* ---------- stats counters and drill-downs ---------- */
const STAT_INFO = {
  cleans: {
    title: "2,340 cleans in the last 12 months, by type",
    lines: [["Regular home cleans","1,486"],["Deep cleans","342"],["Bond cleans","386"],["Commercial visits","126"]],
    total: ["Total cleans","2,340"]
  },
  bond: {
    title: "Bond cleans, first inspection results",
    lines: [["Passed first inspection","374"],["Re-cleaned free within 72 hours","12"]],
    total: ["Bond cleans checked","386 · 97% passed"]
  },
  team: {
    title: "The Saltbush team, employees not contractors",
    lines: [["Full-time cleaners","9"],["Part-time cleaners","5"]],
    total: ["Local cleaners","14"]
  },
  years: {
    title: "Nine years of local cleaning",
    lines: [["2017 to 2019, homes only","3 yrs"],["2020 to 2022, bond cleans added","3 yrs"],["2023 to 2026, commercial added","3 yrs"]],
    total: ["Cleaning local homes","9 yrs"]
  }
};
function countUp(el){
  const target = parseInt(el.dataset.target, 10);
  if (REDUCED){ el.textContent = target.toLocaleString("en-AU"); return; }
  animate(1500, eased => {
    el.textContent = Math.round(eased * target).toLocaleString("en-AU");
  });
}
const counters = $$(".count");
if ("IntersectionObserver" in window && !REDUCED){
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting){ countUp(e.target); io.unobserve(e.target); } });
  }, { threshold: .4 });
  counters.forEach(el => io.observe(el));
} else {
  counters.forEach(countUp);
}
const statPanel = $("#statPanel"), spTitle = $("#statPanelTitle"), spLines = $("#statPanelLines"), spTotal = $("#statPanelTotal");
let openStat = null;
$$(".stat").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.stat;
    if (openStat === key){
      statPanel.hidden = true; openStat = null;
      btn.setAttribute("aria-expanded","false");
      return;
    }
    $$(".stat").forEach(b => b.setAttribute("aria-expanded","false"));
    btn.setAttribute("aria-expanded","true");
    openStat = key;
    const info = STAT_INFO[key];
    spTitle.textContent = info.title;
    spLines.innerHTML = info.lines.map(l => `<li><span>${l[0]}</span><span>${l[1]}</span></li>`).join("");
    spTotal.innerHTML = `<span>${info.total[0]}</span><span>${info.total[1]}</span>`;
    statPanel.hidden = false;
  });
});

/* ---------- home quote calculator ---------- */
const RATES = {
  regular: { label: "Regular clean",  base: 80,  bed: 40, bath: 25, hoursBase: 2.5 },
  deep:    { label: "Deep clean",     base: 112, bed: 56, bath: 35, hoursBase: 4.0 },
  bond:    { label: "Bond clean",     base: 228, bed: 81, bath: 29, hoursBase: 3.0 }
};
const FREQ = {
  weekly:      { mult: .80, label: "Weekly",      saving: "Weekly saving (20%)" },
  fortnightly: { mult: .88, label: "Fortnightly", saving: "Fortnightly saving (12%)" },
  monthly:     { mult: .94, label: "Monthly",     saving: "Monthly saving (6%)" },
  once:        { mult: 1,   label: "Just once",   saving: "" }
};
const EXTRA_DEFS = {
  oven:    { name: "Inside the oven", price: 65 },
  fridge:  { name: "Inside the fridge", price: 39 },
  windows: { name: "Inside windows and tracks", price: 55 },
  balcony: { name: "Balcony or patio", price: 45 },
  carpet:  { name: "Carpet steam", price: 44, perBed: true },
  linen:   { name: "Change bed linen", price: 25 }
};
const state = { bed: 3, bath: 2 };
const priceTotalEl = $("#priceTotal"), breakdownEl = $("#breakdown");
let shownTotal = 220;

function fmtHours(h){
  const r = Math.round(h * 2) / 2;
  return (Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)) + " hrs with a team of 2";
}
function tickTotal(el, from, to){
  if (REDUCED || from === to){ el.textContent = money(to); return; }
  animate(220, (eased, p) => {
    el.textContent = money(Math.round(from + (to - from) * p));
  });
}
function currentType(){
  const r = $('input[name="cleanType"]:checked');
  return r ? r.value : "regular";
}
function currentFreq(){
  const r = $('input[name="freq"]:checked');
  return r ? r.value : "fortnightly";
}
function calcHome(){
  const type = currentType(), rate = RATES[type];
  const subtotal = rate.base + rate.bed * state.bed + rate.bath * state.bath;
  const lines = [];
  lines.push({ name: `${rate.label}, ${state.bed} bed · ${state.bath} bath`, price: subtotal });
  let running = subtotal;
  if (type !== "bond"){
    const f = FREQ[currentFreq()];
    if (f.mult < 1){
      const discounted = Math.round(subtotal * f.mult);
      lines.push({ name: f.saving, price: -(subtotal - discounted), saving: true });
      running = discounted;
    }
  }
  $$(".extra:checked").forEach(cb => {
    const def = EXTRA_DEFS[cb.value];
    if (!def) return;
    if (def.perBed){
      lines.push({ name: `${def.name}, ${state.bed} bedroom${state.bed > 1 ? "s" : ""}`, price: def.price * state.bed });
      running += def.price * state.bed;
    } else {
      lines.push({ name: def.name, price: def.price });
      running += def.price;
    }
  });
  breakdownEl.innerHTML = lines.map(l =>
    `<li${l.saving ? ' class="is-saving"' : ""}><span>${l.name}</span><span>${l.price < 0 ? "−" + money(-l.price) : money(l.price)}</span></li>`
  ).join("");
  tickTotal(priceTotalEl, shownTotal, running);
  shownTotal = running;
  $("#pricePer").textContent = type === "bond" || currentFreq() === "once"
    ? "one-off clean, GST included" : "per clean, GST included";
  $("#factDuration").textContent = fmtHours(rate.hoursBase + .5 * state.bed + .25 * state.bath);
  return { total: running, type, lines };
}
function syncSteppers(){
  $("#bedVal").textContent = state.bed;
  $("#bathVal").textContent = state.bath;
  $$("[data-stepper]").forEach(b => {
    const isBed = b.dataset.stepper === "bed";
    const val = isBed ? state.bed : state.bath;
    const min = 1, max = isBed ? 6 : 4;
    b.disabled = (b.dataset.dir === "-1" && val <= min) || (b.dataset.dir === "1" && val >= max);
  });
}
function syncFreq(){
  const isBond = currentType() === "bond";
  $$('input[name="freq"]').forEach(r => {
    r.disabled = isBond;
    r.closest(".pill-opt").classList.toggle("is-disabled", isBond);
  });
  $("#freqNote").hidden = !isBond;
}
$$("[data-stepper]").forEach(b => {
  b.addEventListener("click", () => {
    const key = b.dataset.stepper, dir = parseInt(b.dataset.dir, 10);
    const max = key === "bed" ? 6 : 4;
    state[key] = Math.min(max, Math.max(1, state[key] + dir));
    syncSteppers(); calcHome();
  });
});
$$('input[name="cleanType"]').forEach(r => r.addEventListener("change", () => { syncFreq(); calcHome(); }));
$$('input[name="freq"]').forEach(r => r.addEventListener("change", calcHome));
$$(".extra").forEach(cb => cb.addEventListener("change", calcHome));
$("#photoToggle").addEventListener("change", e => {
  $("#factPhoto").textContent = e.target.checked
    ? "Photo report sent after every clean" : "Photo report off, turn it on any time";
});
syncSteppers(); syncFreq(); calcHome();

/* bond tiles load the calculator */
$$(".tile").forEach(tile => {
  tile.addEventListener("click", () => {
    const bondRadio = $('input[name="cleanType"][value="bond"]');
    bondRadio.checked = true;
    state.bed = parseInt(tile.dataset.bondBed, 10);
    state.bath = parseInt(tile.dataset.bondBath, 10);
    syncSteppers(); syncFreq(); calcHome();
    $("#quote").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  });
});

/* ---------- booking steps ---------- */
const form = $("#bookForm");
const dateInput = $("#bookDate");
(function(){
  const now = new Date();
  const iso = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  dateInput.min = iso;
})();
function showStep(n){
  $$(".step-panel").forEach(p => { p.hidden = String(n) !== p.dataset.panel; });
  $$(".step-tab").forEach(t => t.classList.toggle("is-active", String(n) === t.dataset.step));
  form.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
}
function validDate(){
  if (!dateInput.value) return false;
  return dateInput.value >= dateInput.min;
}
$$("[data-goto]").forEach(b => {
  b.addEventListener("click", () => {
    const target = b.dataset.goto;
    if (target === "3" && !validDate()){
      $("#dateError").hidden = false;
      showStep(2);
      dateInput.focus();
      return;
    }
    $("#dateError").hidden = true;
    showStep(target);
  });
});
$$(".step-tab").forEach(t => {
  t.addEventListener("click", () => {
    const target = t.dataset.step;
    if ((target === "3") && !validDate()){
      $("#dateError").hidden = false;
      showStep(2);
      return;
    }
    showStep(target);
  });
});
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!validDate()){
    $("#dateError").hidden = false;
    showStep(2);
    dateInput.focus();
    return;
  }
  const name = $("#bkName").value.trim();
  const phone = $("#bkPhone").value.replace(/\D/g, "");
  const email = $("#bkEmail").value.trim();
  const address = $("#bkAddress").value.trim();
  let ok = true, firstBad = null;
  const check = (bad, errId, input) => {
    $("#" + errId).hidden = !bad;
    if (bad){ ok = false; if (!firstBad) firstBad = input; }
  };
  check(name.length < 2, "nameError", $("#bkName"));
  check(phone.length < 10, "phoneError", $("#bkPhone"));
  check(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "emailError", $("#bkEmail"));
  check(address.length < 6, "addressError", $("#bkAddress"));
  if (!ok){ firstBad.focus(); return; }
  const { total, type } = calcHome();
  const freqLabel = type === "bond" ? "One-off clean" : FREQ[currentFreq()].label;
  const win = $('input[name="window"]:checked').value;
  const access = $('input[name="access"]:checked').value;
  const d = new Date(dateInput.value + "T00:00:00");
  const dateStr = d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const extrasCount = $$(".extra:checked").length;
  $("#confirmTitle").textContent = "You are booked in, " + name.split(" ")[0] + ".";
  $("#confirmRef").textContent = "SB-" + Math.floor(1000 + Math.random() * 9000);
  $("#confirmList").innerHTML = [
    ["Clean", `${RATES[type].label}, ${state.bed} bed · ${state.bath} bath${extrasCount ? " · " + extrasCount + " extra" + (extrasCount > 1 ? "s" : "") : ""}`],
    ["Schedule", freqLabel],
    ["When", `${dateStr}, arrival ${win}`],
    ["Address", address],
    ["Access", access],
    ["Total", money(total) + (type === "bond" || currentFreq() === "once" ? ", one-off" : ", per clean")]
  ].map(r => `<li><span>${r[0]}</span><span>${r[1]}</span></li>`).join("");
  $$(".step-panel").forEach(p => { p.hidden = p.dataset.panel !== "done"; });
  $$(".step-tab").forEach(t => t.classList.remove("is-active"));
  form.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
});
$("#bookAgain").addEventListener("click", () => {
  form.reset();
  state.bed = 3; state.bath = 2;
  syncSteppers(); syncFreq(); calcHome();
  showStep(1);
});

/* ---------- commercial calculator ---------- */
const SITE_MULT = { office: 1, medical: 1.25, childcare: 1.15, retail: 1.1, strata: .9 };
const SITE_LABEL = { office: "Office", medical: "Medical or dental", childcare: "Childcare", retail: "Retail or gym", strata: "Strata common areas" };
const areaRange = $("#areaRange"), commTotalEl = $("#commTotal");
let shownComm = 120;
function paintRange(){
  const p = (areaRange.value - areaRange.min) / (areaRange.max - areaRange.min) * 100;
  areaRange.style.background = `linear-gradient(90deg, var(--yellow) ${p}%, rgba(255,255,255,.25) ${p}%)`;
}
function calcComm(){
  const site = $('input[name="siteType"]:checked').value;
  const area = parseInt(areaRange.value, 10);
  const visits = parseInt($('input[name="visits"]:checked').value, 10);
  const perVisit = Math.round((45 + .13 * area) * SITE_MULT[site]);
  const disc = visits >= 5 ? .9 : visits >= 3 ? .95 : 1;
  const week = Math.round(perVisit * visits * disc);
  $("#areaRead").textContent = area.toLocaleString("en-AU") + " m²";
  tickTotal(commTotalEl, shownComm, perVisit);
  shownComm = perVisit;
  $("#commWeek").textContent = `About ${money(week)} a week for ${visits} visit${visits > 1 ? "s" : ""} · ${SITE_LABEL[site]}, ${area.toLocaleString("en-AU")} m², GST included`;
  paintRange();
}
$$('input[name="siteType"]').forEach(r => r.addEventListener("change", calcComm));
$$('input[name="visits"]').forEach(r => r.addEventListener("change", calcComm));
areaRange.addEventListener("input", calcComm);
calcComm();

/* site walk form */
const walkBtn = $("#walkBtn"), walkForm = $("#walkForm");
walkBtn.addEventListener("click", () => {
  const open = walkForm.hidden;
  walkForm.hidden = !open;
  walkBtn.setAttribute("aria-expanded", String(open));
  if (open) $("#wkBiz").focus();
});
walkForm.addEventListener("submit", e => {
  e.preventDefault();
  const ok = $("#wkBiz").value.trim().length >= 2 && $("#wkContact").value.trim().length >= 5;
  $("#walkError").hidden = ok;
  if (!ok) return;
  walkForm.hidden = true;
  walkBtn.hidden = true;
  $("#walkDone").hidden = false;
});

/* ---------- FAQ ---------- */
$$(".faq-item").forEach(item => {
  const q = $(".faq-q", item), a = $(".faq-a", item);
  q.addEventListener("click", () => {
    const open = a.hidden;
    $$(".faq-item").forEach(other => {
      $(".faq-a", other).hidden = true;
      $(".faq-q", other).setAttribute("aria-expanded","false");
    });
    a.hidden = !open;
    q.setAttribute("aria-expanded", String(open));
  });
});

/* ---------- footer actions ---------- */
function setClean(type){
  const r = $(`input[name="cleanType"][value="${type}"]`);
  if (r){ r.checked = true; }
  syncFreq(); calcHome();
  $("#quote").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
}
$$("[data-goto-clean]").forEach(b => b.addEventListener("click", () => setClean(b.dataset.gotoClean)));
$$("[data-goto-extras]").forEach(b => b.addEventListener("click", () => {
  setClean("regular");
  ["oven","windows"].forEach(v => { const cb = $(`.extra[value="${v}"]`); if (cb) cb.checked = true; });
  calcHome();
}));
$$("[data-goto-site]").forEach(b => b.addEventListener("click", () => {
  const r = $(`input[name="siteType"][value="${b.dataset.gotoSite}"]`);
  if (r){ r.checked = true; calcComm(); }
  $("#commercial").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
}));
function footPanel(btnId, panelId, otherBtnId, otherPanelId){
  const btn = $(btnId), panel = $(panelId);
  btn.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    $(otherPanelId).hidden = true;
    $(otherBtnId).setAttribute("aria-expanded","false");
    if (open) panel.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "nearest" });
  });
}
footPanel("#areasBtn", "#areasPanel", "#jobsBtn", "#jobsPanel");
footPanel("#jobsBtn", "#jobsPanel", "#areasBtn", "#areasPanel");

/* ---------- drifting cutouts ---------- */
if (!REDUCED){
  const drifters = $$(".drift[data-drift]");
  let ticking = false;
  const update = () => {
    ticking = false;
    const mid = window.innerHeight / 2;
    drifters.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > window.innerHeight + 80) return;
      const off = (r.top + r.height / 2 - mid) * -0.07 * parseFloat(el.dataset.drift);
      el.style.transform = `translateY(${Math.max(-26, Math.min(26, off)).toFixed(1)}px)`;
    });
  };
  window.addEventListener("scroll", () => {
    if (!ticking){ ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}
})();
