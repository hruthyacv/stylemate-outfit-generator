/**
 * StyleMate — script.js
 * Optimized & Bug-Fixed Version
 */

"use strict";

/* ============================================================
   SECTION 1 — STATE & GLOBALS
   ============================================================ */
let activeFilter = "all";
let selectedStyle = "";
let selectedWeather = "";
let wardrobeItems = [];
let stagedFile = null;

/* ============================================================
   SECTION 2 — ANIMATED PARTICLE BACKGROUND
   ============================================================ */
function initBackground() {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let W, H, particles;

    class Particle {
        constructor() { this.reset(true); }
        reset(initial = false) {
            this.x = Math.random() * W;
            this.y = initial ? Math.random() * H : H + 10;
            this.r = Math.random() * 1.2 + 0.2;
            this.vx = (Math.random() - 0.5) * 0.18;
            this.vy = -(Math.random() * 0.35 + 0.08);
            this.alpha = 0;
            this.alphaMax = Math.random() * 0.35 + 0.05;
            this.alphaStep = Math.random() * 0.003 + 0.001;
            this.fading = false;
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
            ctx.fillStyle = `rgba(200,200,200,1)`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = "rgba(220,220,220,0.8)";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);
    resize();
    particles = Array.from({ length: 90 }, () => new Particle());
    animate();
}

/* ============================================================
   SECTION 3 — DOM REFERENCES (Helper to avoid null errors)
   ============================================================ */
const getEl = (id) => document.getElementById(id);

// Using a proxy or simple object to hold refs after DOM loads
const UI = {}; 

function bindUI() {
    UI.dropZone      = getEl("dropZone");
    UI.fileInput     = getEl("fileInput");
    UI.dropContent   = getEl("dropContent");
    UI.dropPreview   = getEl("dropPreview");
    UI.itemType      = getEl("itemType");
    UI.itemStyle     = getEl("itemStyle");
    UI.itemColor     = getEl("itemColor");
    UI.colorPicker   = getEl("colorPicker");
    UI.itemWeight    = getEl("itemWeight");
    UI.itemName      = getEl("itemName");
    UI.addBtn        = getEl("addBtn");
    UI.uploadMsg     = getEl("uploadMsg");
    UI.wardrobeStrip = getEl("wardrobeStrip");
    UI.wardrobeEmpty = getEl("wardrobeEmpty");
    UI.itemCount     = getEl("itemCount");
    UI.styleChips    = getEl("styleChips");
    UI.weatherChips  = getEl("weatherChips");
    UI.generateBtn   = getEl("generateBtn");
    UI.outputArea    = getEl("outputArea");
    UI.outfitGrid    = getEl("outfitGrid");
    UI.tipBody       = getEl("tipBody");
    UI.regenBtn      = getEl("regenBtn");
    UI.genError      = getEl("genError");
    UI.toast         = getEl("toast");
    UI.filterTabs    = getEl("filterTabs");
}

/* ============================================================
   SECTION 4 — UPLOAD & DROP LOGIC
   ============================================================ */
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
        UI.dropPreview.src = e.target.result;
        UI.dropPreview.hidden = false;
        UI.dropContent.hidden = true;
    };
    reader.readAsDataURL(file);
    setMsg("", "");
}

async function uploadItem() {
    if (!stagedFile) { setMsg("Please select an image first.", "error"); shake(UI.dropZone); return; }
    if (!UI.itemType.value) { setMsg("Please select a category.", "error"); shake(UI.itemType); return; }
    
    const fd = new FormData();
    fd.append("file",   stagedFile);
    fd.append("type",   UI.itemType.value);
    fd.append("style",  UI.itemStyle.value);
    fd.append("color",  UI.itemColor.value.trim().toLowerCase());
    fd.append("weight", UI.itemWeight.value);
    fd.append("name",   UI.itemName.value.trim() || "Untitled Item");

    UI.addBtn.disabled = true;
    setMsg("Uploading...", "");

    try {
        const res = await fetch("/upload", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Upload failed");

        wardrobeItems.push(data);
        renderWardrobe();
        resetUploadForm();
        showToast(`✦ "${data.name}" added!`);
        setMsg("Success!", "success");
    } catch (err) {
        setMsg(err.message, "error");
    } finally {
        UI.addBtn.disabled = false;
    }
}

function resetUploadForm() {
    stagedFile = null;
    UI.fileInput.value = "";
    UI.dropPreview.src = "";
    UI.dropPreview.hidden = true;
    UI.dropContent.hidden = false;
    UI.itemName.value = "";
    UI.itemColor.value = "";
}

/* ============================================================
   SECTION 5 — WARDROBE RENDERING
   ============================================================ */
function renderWardrobe() {
    if (!UI.wardrobeStrip) return;

    const items = activeFilter === "all" 
        ? wardrobeItems 
        : wardrobeItems.filter(i => i.type === activeFilter);

    // Clear previous cards but keep the empty state element
    const emptyState = UI.wardrobeEmpty;
    UI.wardrobeStrip.innerHTML = '';
    UI.wardrobeStrip.appendChild(emptyState);

    UI.itemCount.textContent = `${wardrobeItems.length} piece${wardrobeItems.length !== 1 ? "s" : ""}`;

    if (items.length === 0) {
        emptyState.hidden = false;
    } else {
        emptyState.hidden = true;
        items.forEach(item => {
            const card = buildWardrobeCard(item);
            UI.wardrobeStrip.insertBefore(card, emptyState);
        });
    }
}

function buildWardrobeCard(item) {
    const card = document.createElement("div");
    card.className = "wardrobe-card";
    
    const colorDot = item.color 
        ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};border:1px solid rgba(255,255,255,0.2);margin-right:4px;"></span>` 
        : "";

    card.innerHTML = `
        <img src="${item.url}" alt="${esc(item.name)}" />
        <div class="wardrobe-card-overlay">
            <div class="card-meta-type">${typeLabel(item.type)}</div>
            <div class="card-meta-name">${esc(item.name)}</div>
            <div class="card-meta-tags">
                <span class="card-tag">${cap(item.style)}</span>
                ${item.color ? `<span class="card-tag">${colorDot}${esc(item.color)}</span>` : ""}
            </div>
        </div>
        <button class="card-delete">✕</button>
    `;

    card.querySelector(".card-delete").onclick = () => deleteItem(item.id, card);
    return card;
}

async function deleteItem(id, cardEl) {
    if(!confirm("Remove this item?")) return;
    try {
        const res = await fetch(`/wardrobe/${id}`, { method: "DELETE" });
        if (res.ok) {
            wardrobeItems = wardrobeItems.filter(i => i.id !== id);
            cardEl.remove();
            renderWardrobe();
            showToast("Item removed.");
        }
    } catch (err) {
        showToast("Error deleting item.");
    }
}

/* ============================================================
   SECTION 6 — UTILS & INIT
   ============================================================ */
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

function typeLabel(t) {
    const labels = { top: "Top", bottom: "Bottom", shoes: "Shoes", accessory: "Accessory" };
    return labels[t] || cap(t);
}

function setMsg(msg, type) {
    UI.uploadMsg.textContent = msg;
    UI.uploadMsg.className = `upload-msg ${type}`;
}

function showToast(msg) {
    UI.toast.textContent = msg;
    UI.toast.classList.add("show");
    setTimeout(() => UI.toast.classList.remove("show"), 3000);
}

function shake(el) {
    el.classList.add("shake-anim");
    setTimeout(() => el.classList.remove("shake-anim"), 400);
}

// Global Initialization
document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    initBackground();

    // Event Listeners
    UI.dropZone.onclick = () => UI.fileInput.click();
    UI.fileInput.onchange = () => { if (UI.fileInput.files[0]) stageFile(UI.fileInput.files[0]); };
    UI.addBtn.onclick = uploadItem;

    UI.colorPicker.oninput = () => {
        UI.itemColor.value = hexToName(UI.colorPicker.value);
    };

    // Filter Tabs
    UI.filterTabs.querySelectorAll(".tab").forEach(tab => {
        tab.onclick = () => {
            UI.filterTabs.querySelector(".tab.active").classList.remove("active");
            tab.classList.add("active");
            activeFilter = tab.dataset.filter;
            renderWardrobe();
        };
    });

    // Load initial data
    (async function load() {
        try {
            const res = await fetch("/wardrobe");
            const data = await res.json();
            wardrobeItems = Array.isArray(data) ? data : [];
        } catch (e) { console.error("Load failed"); }
        renderWardrobe();
    })();
});

/** Copy of your hexToName function (logic was fine) */
function hexToName(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const bri = (r * 299 + g * 587 + b * 114) / 1000;
    if (bri > 230) return "white";
    if (bri < 25) return "black";
    const d = 65;
    if (r - g > d && r - b > d) return "red";
    if (g - r > d && g - b > d) return "green";
    if (b - r > d && b - g > d) return "blue";
    return "custom"; 
}
