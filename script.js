/**
 * StyleMate — script.js
 * =====================
 * Handles: animated background, image upload (fetch POST /upload),
 * wardrobe display + filtering, chip preferences, and outfit
 * generation (fetch GET /generate) — all without page reloads.
 */

"use strict";

/* ============================================================
   SECTION 1 — ANIMATED PARTICLE BACKGROUND
   ============================================================ */

(function initBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, particles;

  /** A single floating particle (dust mote / sparkle) */
  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : H + 10;
      this.r  = Math.random() * 1.2 + 0.2;
      this.vx = (Math.random() - 0.5) * 0.18;
      this.vy = -(Math.random() * 0.35 + 0.08);
      this.alpha     = 0;
      this.alphaMax  = Math.random() * 0.35 + 0.05;
      this.alphaStep = Math.random() * 0.003 + 0.001;
      this.fading    = false;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (!this.fading) {
        this.alpha = Math.min(this.alpha + this.alphaStep, this.alphaMax);
        if (this.alpha >= this.alphaMax && Math.random() < 0.002) this.fading = true;
      } else {
        this.alpha -= this.alphaStep * 0.7;
      }
      if (this.alpha <= 0 || this.y < -10) this.reset();
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle   = `rgba(200,200,200,1)`;
      ctx.shadowBlur  = 4;
      ctx.shadowColor = "rgba(220,220,220,0.8)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    particles = Array.from({ length: 90 }, () => new Particle());
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  init();
  loop();
})();

/* ============================================================
   SECTION 2 — STATE
   ============================================================ */

let activeFilter    = "all";
let selectedStyle   = "";
let selectedWeather = "";
/** Local cache of wardrobe items from the server */
let wardrobeItems   = [];

/* ============================================================
   SECTION 3 — DOM REFERENCES
   ============================================================ */

const dropZone      = document.getElementById("dropZone");
const fileInput     = document.getElementById("fileInput");
const dropContent   = document.getElementById("dropContent");
const dropPreview   = document.getElementById("dropPreview");
const itemTypeEl    = document.getElementById("itemType");
const itemStyleEl   = document.getElementById("itemStyle");
const itemColorEl   = document.getElementById("itemColor");
const colorPicker   = document.getElementById("colorPicker");
const itemWeightEl  = document.getElementById("itemWeight");
const itemNameEl    = document.getElementById("itemName");
const addBtn        = document.getElementById("addBtn");
const uploadMsg     = document.getElementById("uploadMsg");
const wardrobeStrip = document.getElementById("wardrobeStrip");
const wardrobeEmpty = document.getElementById("wardrobeEmpty");
const itemCount     = document.getElementById("itemCount");
const styleChips    = document.getElementById("styleChips");
const weatherChips  = document.getElementById("weatherChips");
const generateBtn   = document.getElementById("generateBtn");
const outputArea    = document.getElementById("outputArea");
const outfitGrid    = document.getElementById("outfitGrid");
const tipBody       = document.getElementById("tipBody");
const regenBtn      = document.getElementById("regenBtn");
const genError      = document.getElementById("genError");
const toast         = document.getElementById("toast");
const filterTabs    = document.getElementById("filterTabs");

/** Staged file before upload */
let stagedFile = null;

/* ============================================================
   SECTION 4 — DROP ZONE
   ============================================================ */

dropZone.addEventListener("click",  () => fileInput.click());
dropZone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) stageFile(fileInput.files[0]);
});

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files.length) stageFile(e.dataTransfer.files[0]);
});

/**
 * Preview a selected file in the drop zone.
 * @param {File} file
 */
function stageFile(file) {
  if (!file.type.startsWith("image/")) {
    setMsg("Please select an image file.", "error");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    setMsg("File must be under 8 MB.", "error");
    return;
  }

  stagedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    dropPreview.src = e.target.result;
    dropPreview.hidden  = false;
    dropContent.hidden  = true;
  };
  reader.readAsDataURL(file);
  setMsg("", "");
}

/* ============================================================
   SECTION 5 — UPLOAD TO SERVER (POST /upload)
   ============================================================ */

addBtn.addEventListener("click", uploadItem);

async function uploadItem() {
  // Validate required fields
  if (!stagedFile) {
    setMsg("Please select an image first.", "error");
    shake(dropZone);
    return;
  }
  if (!itemTypeEl.value) {
    setMsg("Please select a category.", "error");
    shake(itemTypeEl);
    return;
  }
  if (!itemStyleEl.value) {
    setMsg("Please select a style.", "error");
    shake(itemStyleEl);
    return;
  }

  // Build FormData
  const fd = new FormData();
  fd.append("file",   stagedFile);
  fd.append("type",   itemTypeEl.value);
  fd.append("style",  itemStyleEl.value);
  fd.append("color",  itemColorEl.value.trim().toLowerCase());
  fd.append("weight", itemWeightEl.value);
  fd.append("name",   itemNameEl.value.trim());

  // Disable button during upload
  addBtn.disabled = true;
  setMsg("Uploading…", "");

  try {
    const res  = await fetch("/upload", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setMsg(data.error || "Upload failed.", "error");
      return;
    }

    // Add to local cache and re-render
    wardrobeItems.push(data);
    renderWardrobe();
    resetUploadForm();
    setMsg(`✦ "${data.name}" added to wardrobe!`, "success");
    showToast(`✦ "${data.name}" added!`);

  } catch (err) {
    console.error("Upload error:", err);
    setMsg("Network error. Is the server running?", "error");
  } finally {
    addBtn.disabled = false;
  }
}

/** Reset drop zone and all form fields after a successful upload */
function resetUploadForm() {
  stagedFile           = null;
  fileInput.value      = "";
  dropPreview.src      = "";
  dropPreview.hidden   = true;
  dropContent.hidden   = false;
  itemTypeEl.value     = "";
  itemStyleEl.value    = "";
  itemColorEl.value    = "";
  colorPicker.value    = "#1a1a1a";
  itemWeightEl.value   = "medium";
  itemNameEl.value     = "";
}

/* ============================================================
   SECTION 6 — WARDROBE RENDERING
   ============================================================ */

/** Render the wardrobe strip filtered by activeFilter */
function renderWardrobe() {
  const items = activeFilter === "all"
    ? wardrobeItems
    : wardrobeItems.filter(i => i.type === activeFilter);

  // Remove existing cards (not the empty state element)
  Array.from(wardrobeStrip.children).forEach(child => {
    if (child.id !== "wardrobeEmpty") child.remove();
  });

  if (items.length === 0) {
    wardrobeEmpty.hidden = false;
    itemCount.textContent = `0 pieces`;
    return;
  }

  wardrobeEmpty.hidden = true;
  itemCount.textContent = `${wardrobeItems.length} piece${wardrobeItems.length !== 1 ? "s" : ""}`;

  items.forEach(item => {
    const card = buildWardrobeCard(item);
    wardrobeStrip.insertBefore(card, wardrobeEmpty);
  });
}

/**
 * Build a wardrobe card DOM element.
 * @param {Object} item
 * @returns {HTMLElement}
 */
function buildWardrobeCard(item) {
  const card = document.createElement("div");
  card.className  = "wardrobe-card";
  card.dataset.id = item.id;

  const colorDot = item.color
    ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${item.color};margin-right:3px;"></span>`
    : "";

  card.innerHTML = `
    <img src="${item.url}" alt="${esc(item.name)}" loading="lazy" />
    <div class="wardrobe-card-overlay">
      <div class="card-meta-type">${typeLabel(item.type)}</div>
      <div class="card-meta-name">${esc(item.name)}</div>
      <div class="card-meta-tags">
        <span class="card-tag">${cap(item.style)}</span>
        ${item.color ? `<span class="card-tag">${colorDot}${esc(item.color)}</span>` : ""}
        <span class="card-tag">${cap(item.weight)}</span>
      </div>
    </div>
    <button class="card-delete" aria-label="Remove ${esc(item.name)}">✕</button>
  `;

  // Wire delete
  card.querySelector(".card-delete").addEventListener("click", async e => {
    e.stopPropagation();
    await deleteItem(item.id, card);
  });

  return card;
}

/**
 * Delete an item from server and remove from local cache.
 * @param {number} id
 * @param {HTMLElement} cardEl
 */
async function deleteItem(id, cardEl) {
  try {
    const res = await fetch(`/wardrobe/${id}`, { method: "DELETE" });
    if (!res.ok) { showToast("Could not delete item."); return; }

    wardrobeItems = wardrobeItems.filter(i => i.id !== id);

    // Animate out
    cardEl.style.transition  = "transform 0.2s, opacity 0.2s";
    cardEl.style.transform   = "scale(0.85)";
    cardEl.style.opacity     = "0";
    setTimeout(() => renderWardrobe(), 220);

    showToast("Item removed.");
  } catch {
    showToast("Network error.");
  }
}

/* ── Filter tabs ──────────────────────────────────────────── */
filterTabs.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    filterTabs.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderWardrobe();
  });
});

/* ============================================================
   SECTION 7 — PREFERENCES (CHIPS)
   ============================================================ */

function initChipGroup(groupEl, onChange) {
  groupEl.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      groupEl.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      onChange(chip.dataset.value);
    });
  });
}

initChipGroup(styleChips,   val => { selectedStyle   = val; });
initChipGroup(weatherChips, val => { selectedWeather = val; });

/* ============================================================
   SECTION 8 — GENERATE OUTFIT (GET /generate)
   ============================================================ */

generateBtn.addEventListener("click",  handleGenerate);
regenBtn.addEventListener("click",     handleGenerate);

async function handleGenerate() {
  // Clear any previous error
  genError.hidden = true;
  genError.textContent = "";
  generateBtn.classList.add("loading");

  try {
    const params = new URLSearchParams({
      style:   selectedStyle,
      weather: selectedWeather,
    });

    const res  = await fetch(`/generate?${params}`);
    const data = await res.json();

    if (!res.ok) {
      showGenError(data.error || "Could not generate outfit. Please check your wardrobe.");
      return;
    }

    renderOutfit(data.outfit, data.tip);

  } catch (err) {
    console.error("Generate error:", err);
    showGenError("Network error. Make sure the server is running.");
  } finally {
    generateBtn.classList.remove("loading");
  }
}

/**
 * Render the generated outfit into the output area.
 * @param {Object[]} items
 * @param {string}   tip
 */
function renderOutfit(items, tip) {
  // Build outfit piece cards
  outfitGrid.innerHTML = "";

  items.forEach(item => {
    const piece = document.createElement("div");
    piece.className = "outfit-piece";
    piece.innerHTML = `
      <div class="outfit-img-wrap">
        <img src="${item.url}" alt="${esc(item.name)}" loading="lazy" />
      </div>
      <div class="outfit-cat">${typeLabel(item.type)}</div>
      <div class="outfit-name">${esc(item.name)}</div>
    `;
    outfitGrid.appendChild(piece);
  });

  // Set styling tip
  tipBody.textContent = tip;

  // Show output area
  outputArea.hidden = false;

  // Smooth scroll to output
  setTimeout(() => {
    outputArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

function showGenError(msg) {
  genError.textContent = msg;
  genError.hidden      = false;
  outputArea.hidden    = true;
}

/* ============================================================
   SECTION 9 — COLOR PICKER SYNC
   ============================================================ */

colorPicker.addEventListener("input", () => {
  if (!itemColorEl.value.trim()) {
    itemColorEl.value = hexToName(colorPicker.value);
  }
});

/**
 * Very rough hex-to-name approximation for auto-filling the color field.
 * @param {string} hex
 * @returns {string}
 */
function hexToName(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bri = (r * 299 + g * 587 + b * 114) / 1000;

  if (bri > 230) return "white";
  if (bri < 25)  return "black";

  const d = 65;
  if (r - g > d && r - b > d) return "red";
  if (g - r > d && g - b > d) return "green";
  if (b - r > d && b - g > d) return "blue";
  if (r > 190 && g > 140 && b < 80) return "orange";
  if (r > 190 && g > 190 && b < 70) return "yellow";
  if (r > 140 && b > 140 && g < 90) return "purple";
  if (r > 190 && g < 90 && b > 130) return "pink";
  if (r < 90 && g > 100 && b > 120) return "teal";
  if (r > 90 && g > 70 && b < 50)   return "brown";
  if (bri > 165) return "light grey";
  if (bri > 75)  return "grey";
  return "dark";
}

/* ============================================================
   SECTION 10 — LOAD WARDROBE ON STARTUP
   ============================================================ */

async function loadWardrobe() {
  try {
    const res  = await fetch("/wardrobe");
    const data = await res.json();
    if (Array.isArray(data)) {
      wardrobeItems = data;
      renderWardrobe();
    }
  } catch (err) {
    console.warn("Could not load wardrobe:", err);
  }
}

/* ============================================================
   SECTION 11 — UTILITY FUNCTIONS
   ============================================================ */

/** HTML-escape a string to prevent XSS */
function esc(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

/** Capitalise first letter */
function cap(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Human-readable category label */
function typeLabel(type) {
  return { top: "Top", bottom: "Bottom", shoes: "Shoes", accessory: "Accessory" }[type] || cap(type);
}

/**
 * Set the upload feedback message.
 * @param {string} msg
 * @param {"success"|"error"|""} type
 */
function setMsg(msg, type) {
  uploadMsg.textContent = msg;
  uploadMsg.className   = `upload-msg ${type}`;
}

/**
 * Show a temporary toast at the bottom of the screen.
 * @param {string} msg
 * @param {number} [ms=2600]
 */
let _toastTimer = null;
function showToast(msg, ms = 2600) {
  clearTimeout(_toastTimer);
  toast.textContent = msg;
  toast.classList.add("show");
  _toastTimer = setTimeout(() => toast.classList.remove("show"), ms);
}

/**
 * Shake an element briefly (validation feedback).
 * @param {HTMLElement} el
 */
function shake(el) {
  el.style.animation = "none";
  void el.offsetHeight; // reflow
  el.style.animation = "shake 0.38s ease";
  setTimeout(() => { el.style.animation = ""; }, 400);
}

/* ============================================================
   SECTION 12 — INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadWardrobe();
  console.log("✦ StyleMate ready.");
});
