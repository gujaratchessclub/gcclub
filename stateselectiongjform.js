// RTDeventform.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXrHcMJzQn3cxutg41LZs9oYwEfALe00s",
  authDomain: "ratedeventsgj.firebaseapp.com",
  projectId: "ratedeventsgj",
  storageBucket: "ratedeventsgj.firebasestorage.app",
  messagingSenderId: "527826897689",
  appId: "1:527826897689:web:fb0439fff04a695a599388"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_PIN = "270620";

// ── DATE ──────────────────────────────────────────────────
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const now = new Date();
document.getElementById("datePill").textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── HELPERS ───────────────────────────────────────────────
function getVal(id) { return document.getElementById(id)?.value.trim() || ""; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ""; }
function showError(id, msg) {
  const el = document.getElementById("err-" + id); if (el) el.textContent = msg;
  const inp = document.getElementById(id); if (inp) inp.classList.add("error");
}
function clearAllErrors() {
  document.querySelectorAll(".field-error").forEach(e => e.textContent = "");
  document.querySelectorAll(".field-input").forEach(e => e.classList.remove("error"));
}

function formatIndianCurrency(val) {
  const num = val.replace(/\D/g, "");
  if (!num) return "";
  let x = num;
  let lastThree = x.substring(x.length - 3);
  let other = x.substring(0, x.length - 3);
  if (other !== "") lastThree = "," + lastThree;
  return other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + " Rs.";
}

function attachCurrencyPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
    const fmt = formatIndianCurrency(input.value);
    preview.textContent = fmt ? `→ ${fmt}` : "";
  });
}
attachCurrencyPreview("prizeFund","prizePreview");
attachCurrencyPreview("earlyBirdFees","earlyBirdPreview");
attachCurrencyPreview("actualFees","actualFeesPreview");
attachCurrencyPreview("lateEntryFees","lateEntryPreview");

document.querySelectorAll(".uppercase-input").forEach(el => {
  el.addEventListener("input", () => { el.value = el.value.toUpperCase(); });
});

document.querySelectorAll('input[name="enteredBy"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const val = radio.value;
    document.getElementById("pinNote").textContent = val === "Admin"
      ? "Enter the Admin PIN to submit." : "Enter your Organizer PIN.";
    document.getElementById("pinLabel").innerHTML = `${val} PIN <span class="req">*</span>`;
  });
});

document.getElementById("startDate").addEventListener("change", () => {
  const sd = document.getElementById("startDate").value;
  document.getElementById("endDate").min = sd;
  if (document.getElementById("endDate").value < sd) document.getElementById("endDate").value = sd;
});

["ca1FideId","dca1FideId","dca2FideId","tdFideId"].forEach(id => {
  document.getElementById(id).addEventListener("input", function() { this.value = this.value.replace(/\D/g, ""); });
});

// ── ORGANIZER SEARCH ──────────────────────────────────────
let organizersList = [];
async function loadOrganizers() {
  const snap = await getDocs(collection(db, "organizerdb"));
  organizersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
loadOrganizers();

const searchInput = document.getElementById("organizerSearch");
const dropdown = document.getElementById("organizerDropdown");

searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  dropdown.innerHTML = "";
  if (!q) { dropdown.classList.remove("open"); return; }
  const matches = organizersList.filter(o => (o.organizerName || "").toLowerCase().includes(q));
  if (matches.length === 0) {
    dropdown.innerHTML = `<div class="dropdown-empty">No organizer found</div>`;
  } else {
    matches.forEach(org => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.textContent = org.organizerName;
      item.addEventListener("click", () => {
        searchInput.value = org.organizerName;
        document.getElementById("organizerID").value = org.organizerID || org.id;
        document.getElementById("organizerNameVal").value = org.organizerName;
        searchInput.dataset.pin = org.pin || "";
        dropdown.classList.remove("open");
        document.getElementById("err-organizer").textContent = "";
        searchInput.classList.remove("error");
      });
      dropdown.appendChild(item);
    });
  }
  dropdown.classList.add("open");
});
document.addEventListener("click", e => { if (!e.target.closest(".searchable-wrap")) dropdown.classList.remove("open"); });

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ── EDIT MODE ─────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const editDocId = urlParams.get("editDocId");
let isEditMode = false;
let editDocFirebaseId = null;

async function initEditMode() {
  if (!editDocId) return;
  isEditMode = true;
  editDocFirebaseId = editDocId;
  document.querySelector(".form-subtitle").textContent = "Edit Rated Event";
  document.getElementById("submitBtn").querySelector(".btn-text").textContent = "Update Event";

  // Find in stateselectiongjdb
  const q = query(collection(db, "stateselectiongjdb"), where("__name__", "==", editDocId));
  // Use direct doc fetch
  const snap = await getDocs(collection(db, "stateselectiongjdb"));
  const found = snap.docs.find(d => d.id === editDocId);
  if (found) fillForm(found.data());
}

function fillForm(data) {
  if (data.enteredBy) {
    const r = document.querySelector(`input[name="enteredBy"][value="${data.enteredBy}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event("change")); }
  }
  // Organizer
  if (data.organizerName) {
    document.getElementById("organizerSearch").value = data.organizerName;
    document.getElementById("organizerNameVal").value = data.organizerName;
    document.getElementById("organizerID").value = data.organizerID || "";
  }
  setVal("eventName", data.eventName);
  setVal("startDate", data.startDate);
  setVal("endDate", data.endDate);
  setVal("system", data.system);
  setVal("format", data.format);
  setVal("timeControl", data.timeControl === "—" ? "" : data.timeControl);
  setVal("district", data.district);
  setVal("venue", data.venue === "DECLARE SOON / UPDATE SOON" ? "" : data.venue);

  // Prize fund - extract raw number
  if (data.prizeFund && data.prizeFund !== "To Be Announced") {
    const raw = data.prizeFund.replace(/[^0-9]/g, "");
    setVal("prizeFund", raw);
    document.getElementById("prizePreview").textContent = `→ ${data.prizeFund}`;
  }

  const ef = data.entryFees || {};
  setVal("earlyBirdDate", ef.earlyBird?.date !== "—" ? convertDisplayToInput(ef.earlyBird?.date) : "");
  if (ef.earlyBird?.fees && ef.earlyBird.fees !== "—") { const r = ef.earlyBird.fees.replace(/[^0-9]/g,""); setVal("earlyBirdFees", r); document.getElementById("earlyBirdPreview").textContent = `→ ${ef.earlyBird.fees}`; }
  if (ef.actual?.fees && ef.actual.fees !== "To Be Announced") { const r = ef.actual.fees.replace(/[^0-9]/g,""); setVal("actualFees", r); document.getElementById("actualFeesPreview").textContent = `→ ${ef.actual.fees}`; }
  setVal("lateEntryDate", ef.lateEntry?.date !== "—" ? convertDisplayToInput(ef.lateEntry?.date) : "");
  if (ef.lateEntry?.fees && ef.lateEntry.fees !== "—") { const r = ef.lateEntry.fees.replace(/[^0-9]/g,""); setVal("lateEntryFees", r); document.getElementById("lateEntryPreview").textContent = `→ ${ef.lateEntry.fees}`; }

  const td = data.tournamentDirector || {};
  setVal("tdName", td.name); setVal("tdFideId", td.fideId);
  const arb = data.arbiters || {};
  setVal("ca1Name", arb.chiefArbiter?.name); setVal("ca1FideId", arb.chiefArbiter?.fideId);
  setVal("dca1Name", arb.deputyCA1?.name); setVal("dca1FideId", arb.deputyCA1?.fideId);
  setVal("dca2Name", arb.deputyCA2?.name); setVal("dca2FideId", arb.deputyCA2?.fideId);

  const lk = data.links || {};
  setVal("brochureLink", lk.brochure); setVal("chessResultsLink", lk.chessResults);
  setVal("mapLink", lk.map); setVal("liveGamesLink", lk.liveGames); setVal("prizeListLink", lk.prizeList);
}

function convertDisplayToInput(displayDate) {
  if (!displayDate || displayDate === "—") return "";
  const parts = displayDate.split("/");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

initEditMode();

// ── VALIDATION ────────────────────────────────────────────
function validateForm() {
  let valid = true; clearAllErrors();
  if (!document.querySelector('input[name="enteredBy"]:checked')?.value) { document.getElementById("err-enteredBy").textContent = "Please select Admin or Organizer."; valid = false; }
  if (!document.getElementById("organizerNameVal").value) { showError("organizer","Please select an organizer."); document.getElementById("organizerSearch").classList.add("error"); valid = false; }
  if (!getVal("eventName")) { showError("eventName","Event name is required."); valid = false; }
  if (!getVal("startDate")) { showError("startDate","Start date is required."); valid = false; }
  if (!getVal("endDate")) { showError("endDate","End date is required."); valid = false; }
  if (getVal("startDate") && getVal("endDate") && getVal("endDate") < getVal("startDate")) { showError("endDate","End date cannot be before start date."); valid = false; }
  if (!getVal("system")) { showError("system","Please select a system."); valid = false; }
  if (!getVal("format")) { showError("format","Please select a format."); valid = false; }
  if (!getVal("district")) { showError("district","Please select a district."); valid = false; }
  if (!getVal("pinInput")) { showError("pin","PIN is required."); valid = false; }
  return valid;
}

// ── PIN VERIFY ────────────────────────────────────────────
async function verifyPin(enteredBy, pin) {
  if (enteredBy === "Admin") return pin === ADMIN_PIN;
  return pin === document.getElementById("organizerSearch").dataset.pin;
}

// ── SUBMIT ────────────────────────────────────────────────
document.getElementById("eventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  const btn = document.getElementById("submitBtn");
  btn.disabled = true; btn.querySelector(".btn-text").textContent = "Verifying...";
  try {
    const enteredBy = document.querySelector('input[name="enteredBy"]:checked').value;
    const enteredPin = getVal("pinInput");
    if (!(await verifyPin(enteredBy, enteredPin))) {
      document.getElementById("err-pin").textContent = enteredBy === "Admin" ? "Wrong Admin PIN." : "Wrong Organizer PIN.";
      document.getElementById("pinInput").classList.add("error");
      btn.disabled = false; btn.querySelector(".btn-text").textContent = isEditMode ? "Update Event" : "Submit Event";
      return;
    }
    btn.querySelector(".btn-text").textContent = "Saving...";
    const nowDate = new Date();
    const dd = String(nowDate.getDate()).padStart(2,"0");
    const mm = String(nowDate.getMonth()+1).padStart(2,"0");
    const yyyy = nowDate.getFullYear();

    const data = {
      enteredBy,
      entryDate: `${dd}/${mm}/${yyyy}`,
      entryTime: nowDate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
      organizerID: document.getElementById("organizerID").value,
      organizerName: document.getElementById("organizerNameVal").value,
      eventName: getVal("eventName"),
      startDate: getVal("startDate"),
      startDateDisplay: formatDateDisplay(getVal("startDate")),
      endDate: getVal("endDate"),
      endDateDisplay: formatDateDisplay(getVal("endDate")),
      system: getVal("system"),
      format: getVal("format"),
      timeControl: getVal("timeControl") || "—",
      district: getVal("district"),
      venue: getVal("venue") || "DECLARE SOON / UPDATE SOON",
      prizeFund: getVal("prizeFund") ? formatIndianCurrency(getVal("prizeFund")) : "To Be Announced",
      entryFees: {
        earlyBird: { date: formatDateDisplay(getVal("earlyBirdDate")), fees: getVal("earlyBirdFees") ? formatIndianCurrency(getVal("earlyBirdFees")) : "—" },
        actual: { fees: getVal("actualFees") ? formatIndianCurrency(getVal("actualFees")) : "To Be Announced" },
        lateEntry: { date: formatDateDisplay(getVal("lateEntryDate")), fees: getVal("lateEntryFees") ? formatIndianCurrency(getVal("lateEntryFees")) : "—" }
      },
      tournamentDirector: { name: getVal("tdName"), fideId: getVal("tdFideId") },
      arbiters: {
        chiefArbiter: { name: getVal("ca1Name"), fideId: getVal("ca1FideId") },
        deputyCA1: { name: getVal("dca1Name"), fideId: getVal("dca1FideId") },
        deputyCA2: { name: getVal("dca2Name"), fideId: getVal("dca2FideId") }
      },
      links: { brochure: getVal("brochureLink"), chessResults: getVal("chessResultsLink"), map: getVal("mapLink"), liveGames: getVal("liveGamesLink"), prizeList: getVal("prizeListLink") }
    };

    if (isEditMode && editDocFirebaseId) {
      await updateDoc(doc(db, "stateselectiongjdb", editDocFirebaseId), data);
      document.getElementById("overlayTitle").textContent = "Event Updated!";
      document.getElementById("successMsg").textContent = "Event details updated successfully.";
    } else {
      await addDoc(collection(db, "stateselectiongjdb"), data);
      document.getElementById("overlayTitle").textContent = "Event Registered!";
      document.getElementById("successMsg").textContent = "Event saved and now live on State Selection GJ page.";
    }
    document.getElementById("successOverlay").classList.add("active");
  } catch (err) { alert("Error: " + err.message); console.error(err); }
  finally { btn.disabled = false; btn.querySelector(".btn-text").textContent = isEditMode ? "Update Event" : "Submit Event"; }
});
