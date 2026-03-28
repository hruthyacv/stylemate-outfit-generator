/**
 * StyleMate — script.js
 * ======================
 * Handles: wardrobe management, outfit generation logic,
 * color matching, weather-based filtering, and UI interactions.
 * No frameworks. No backend. Pure JS + localStorage.
 */

"use strict";

/* ============================================================
   SECTION 1 — STATE & CONSTANTS
   ============================================================ */

/** Wardrobe items array — persisted to localStorage */
let wardrobe = [];

/** Currently pending delete ID (for modal) */
let pendingDeleteId = null;

/** Active filter tab for wardrobe display */
let activeFilter = "all";

/** User's style & weather preferences */
let selectedStyle = "";
let selectedWeather = "";

/** Unique ID counter */
let idCounter = Date.now();

/**
 * Color compatibility table.
 * Maps color keyword → group.
 * Colors in the same or adjacent groups are complementary;
 * opposite groups may clash.
 */
const COLOR_GROUPS = {
  // Neutrals — mix with anything
  neutrals: ["white", "cream", "ivory", "beige", "off-white", "khaki", "sand",
             "grey", "gray", "charcoal", "black", "navy"],

  // Warm earthy
  earthy: ["brown", "camel", "tan", "rust", "terracotta", "olive", "mustard",
           "warm grey", "taupe", "burgundy", "wine", "chocolate"],

  // Cool blues / greens
  cool: ["blue", "light blue", "sky blue", "powder blue", "teal", "cyan",
         "mint", "sage", "forest green", "green", "emerald", "cobalt"],

  // Warm reds / pinks
  warm: ["red", "pink", "coral", "salmon", "rose", "blush", "peach",
         "hot pink", "magenta", "fuchsia"],

  // Bright / Neon
  bright: ["neon green", "neon pink", "neon yellow", "lime", "bright yellow",
           "electric blue", "orange", "bright orange"],

  // Purples
  purples: ["purple", "violet", "lavender", "lilac", "mauve", "plum"],
};

/** Pairs that are notorious clashes (avoid pairing these) */
const CLASH_PAIRS = [
  ["bright", "warm"],
  ["bright", "cool"],
  ["bright", "purples"],
  ["neon", "neon"],
];

/**
 * Styling tips library — keyed by [style]-[weather] combos and fallbacks.
 * We pick one tip at random from the matching set.
 */
const STYLING_TIPS = {
  "casual-hot":    [
    "Opt for loose-fitting pieces in breathable fabrics — linen and cotton are your best friends on a warm day.",
    "Keep accessories minimal; a single delicate chain necklace elevates a simple summer look effortlessly.",
    "Light-wash denim with a flowy top strikes the perfect casual-cool balance on a hot day.",
  ],
  "casual-warm":   [
    "Layer a lightweight cardigan over your casual outfit — easy to tie around your waist when it heats up.",
    "Earth tones and soft neutrals feel effortlessly put-together for a comfortable everyday look.",
    "Sneakers in a neutral hue ground nearly any casual pairing beautifully.",
  ],
  "casual-cool":   [
    "A relaxed blazer tossed over a casual outfit instantly adds structure without sacrificing ease.",
    "Experiment with texture — mixing a cozy knit with smooth denim creates tactile interest.",
    "Ankle boots are the perfect transitional shoe that dress up any casual bottom.",
  ],
  "casual-cold":   [
    "Layering is the art of cold-weather dressing. Each layer should work alone and together.",
    "A chunky knit scarf can double as a shawl — warmth with zero extra effort.",
    "Stick to a monochromatic base to make layered cold-weather looks feel cohesive, not chaotic.",
  ],
  "formal-hot":    [
    "Choose structured silhouettes in lightweight fabrics like ponte or tropical wool for warm formal occasions.",
    "A sleeveless blazer or structured shell blouse keeps the formal aesthetic while staying cool.",
    "Barely-there strappy heels or loafers in tan leather keep formal summer looks elevated and airy.",
  ],
  "formal-cold":   [
    "A wool overcoat is the most powerful formal layer — it transforms everything underneath instantly.",
    "Velvet and rich textures like brocade are seasonally appropriate and inherently luxurious for cold formal events.",
    "Keep your formal cold-weather palette deep and saturated — navy, hunter green, burgundy are deeply chic.",
  ],
  "formal-warm":   [
    "The 2-button-open rule on your blazer adds instant elegance. Precision in fit matters above all.",
    "Monochromatic formal outfits — one colour head to toe — are the quietest flex in fashion.",
    "Invest in one pair of beautifully polished shoes. They complete a formal look more than any other piece.",
  ],
  "party-hot":     [
    "Shimmer and gloss fabrics catch the light beautifully — perfect for summer evening events.",
    "Accessorise boldly: statement earrings with a minimal outfit beats a busy look every time.",
    "Don't underestimate the power of a great heel. The right shoe can transform any party-ready outfit.",
  ],
  "party-cold":    [
    "Velvet is your cold-weather party weapon — rich, sumptuous, and eternally glamorous.",
    "A faux-fur stole over a sleek dress is theatrical, warm, and unforgettable.",
    "Metallics in cold tones — silver, gunmetal, champagne — translate seamlessly from cocktail to party.",
  ],
  "sporty-hot":    [
    "Choose moisture-wicking fabrics and keep the palette simple — function and style meet in neutrals.",
    "Matching activewear sets always look intentional. Coordinate your footwear to one colour in the set.",
    "A clean white sneaker is the great equaliser in sporty outfits — never wrong, always sharp.",
  ],
  "sporty-cold":   [
    "Layer a zip-up or half-zip over your base layer — sporty, functional, and very on-trend.",
    "Jogger trousers in technical fabric with a structured puffer jacket is the perfect sporty winter hybrid.",
    "Dark, graphic-free pieces in the sporty category have the longest style shelf-life.",
  ],
  "business-hot":  [
    "Breathable linen trousers paired with a fitted polo or silk shell is a masterclass in business casual dressing.",
    "In summer business settings, loafers replace heeled shoes without sacrificing polish.",
    "Keep accessories sharp and minimal — a leather watch and simple belt communicate authority quietly.",
  ],
  "business-cold": [
    "A beautifully fitted wool blazer is the single most transformative business wardrobe piece.",
    "Cold-weather business style thrives in charcoal, camel, and deep blue tones — authoritative and refined.",
    "Layering a fine-knit turtleneck beneath your blazer is a European-inspired move that never misses.",
  ],
  "boho-hot":      [
    "Maxi skirts with ruffled hems and earthy sandals are quintessential hot-weather boho perfection.",
    "Layer delicate gold jewellery freely — rings, anklets, layered necklaces all at once is exactly right.",
    "Natural linen, cotton gauze, and open weaves are the boho palette's finest fabrics.",
  ],
  "boho-cold":     [
    "Fringe, patchwork, and mixed-texture layering are what boho cold-weather dressing is made for.",
    "A wide-brimmed felt hat is the boho autumn staple. Pair with a flowing duster coat.",
    "Rich amber, rust, forest green, and burnt orange make the boho cold-weather palette sing.",
  ],
  // Fallbacks
  "fallback": [
    "Great style is about confidence first — wear what makes you feel most yourself.",
    "When in doubt, keep the palette to 2–3 tones and let the silhouette do the talking.",
    "The best outfit is the one where every piece earns its place.",
    "Fit is everything. A perfectly fitted simple outfit beats a poorly-fitted expensive one, always.",
    "Style is the art of editing. Remove the last thing you put on — you probably don't need it.",
    "Great accessories are conversation starters. Choose the ones that tell your story.",
    "There are no fashion rules, only fashion principles. Break them knowingly, not carelessly.",
    "Invest in great basics — they make everything else in your wardrobe look better by association.",
  ],
};

/* ============================================================
   SECTION 2 — LOCALSTORAGE PERSISTENCE
   ============================================================ */

/**
 * Load wardrobe from localStorage.
 * If stored data is malformed, we fall back to an empty array.
 */
function loadWardrobe() {
  try {
    const raw = localStorage.getItem("stylemate_wardrobe");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate it's an array before assigning
      wardrobe = Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn("StyleMate: Could not parse wardrobe from storage.", err);
    wardrobe = [];
  }
}

/**
 * Save wardrobe array to localStorage.
 * Images are stored as base64 data URLs, so this can get large;
 * we warn the user gracefully if quota is exceeded.
 */
function saveWardrobe() {
  try {
    localStorage.setItem("stylemate_wardrobe", JSON.stringify(wardrobe));
  } catch (err) {
    // Common error: localStorage quota exceeded (images are heavy)
    if (err.name === "QuotaExceededError" || err.code === 22) {
      showToast("⚠️ Storage full! Try removing some items first.", 4000);
    } else {
      console.error("StyleMate: Could not save wardrobe.", err);
    }
  }
}

/* ============================================================
   SECTION 3 — DOM REFERENCES
   ============================================================ */

const dropZone          = document.getElementById("dropZone");
const fileInput         = document.getElementById("fileInput");
const uploadPreviewWrap = document.getElementById("uploadPreviewWrap");
const uploadPreviewImg  = document.getElementById("uploadPreviewImg");
const removePreviewBtn  = document.getElementById("removePreviewBtn");
const itemTypeEl        = document.getElementById("itemType");
const itemStyleEl       = document.getElementById("itemStyle");
const itemColorEl       = document.getElementById("itemColor");
const itemColorPicker   = document.getElementById("itemColorPicker");
const itemWeightEl      = document.getElementById("itemWeight");
const itemNameEl        = document.getElementById("itemName");
const addItemBtn        = document.getElementById("addItemBtn");
const uploadFeedback    = document.getElementById("uploadFeedback");
const wardrobeGrid      = document.getElementById("wardrobeGrid");
const wardrobeEmpty     = document.getElementById("wardrobeEmpty");
const wardrobeCount     = document.getElementById("wardrobeCount");
const styleChips        = document.getElementById("styleChips");
const weatherChips      = document.getElementById("weatherChips");
const generateBtn       = document.getElementById("generateBtn");
const outputSection     = document.getElementById("outputSection");
const outfitGrid        = document.getElementById("outfitGrid");
const outfitBadges      = document.getElementById("outfitBadges");
const tipText           = document.getElementById("tipText");
const regenerateBtn     = document.getElementById("regenerateBtn");
const scrollUpBtn       = document.getElementById("scrollUpBtn");
const toast             = document.getElementById("toast");
const modalOverlay      = document.getElementById("modalOverlay");
const modalCancelBtn    = document.getElementById("modalCancelBtn");
const modalConfirmBtn   = document.getElementById("modalConfirmBtn");
const clearWardrobeBtn  = document.getElementById("clearWardrobeBtn");
const tabBtns           = document.querySelectorAll(".tab-btn");

/** Currently staged image (base64) waiting to be added */
let stagedImageSrc = null;

/* ============================================================
   SECTION 4 — IMAGE UPLOAD HANDLING
   ============================================================ */

/** Open file dialog when drop zone is clicked or enter pressed */
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

/** Handle actual file selection */
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) processImageFile(fileInput.files[0]);
});

/** Drag-and-drop events */
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processImageFile(file);
});

/**
 * Validate and read an image file, then show the preview.
 * @param {File} file
 */
function processImageFile(file) {
  // Validate type
  if (!file.type.startsWith("image/")) {
    setFeedback("Please upload an image file (JPG, PNG, WEBP).", "error");
    return;
  }
  // Validate size (5MB cap)
  if (file.size > 5 * 1024 * 1024) {
    setFeedback("Image too large. Please use a file under 5MB.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    stagedImageSrc = e.target.result; // base64 data URL
    uploadPreviewImg.src = stagedImageSrc;
    uploadPreviewWrap.hidden = false;
    dropZone.hidden = true;
    setFeedback("Image ready — add your tags and click Add to Wardrobe.", "success");
  };
  reader.onerror = () => setFeedback("Could not read file. Please try another.", "error");
  reader.readAsDataURL(file);
}

/** Remove staged preview and reset */
removePreviewBtn.addEventListener("click", resetUploadForm);

function resetUploadForm() {
  stagedImageSrc = null;
  uploadPreviewImg.src = "";
  uploadPreviewWrap.hidden = true;
  dropZone.hidden = false;
  fileInput.value = "";
  setFeedback("", "");
}

/* ============================================================
   SECTION 5 — ADD ITEM TO WARDROBE
   ============================================================ */

addItemBtn.addEventListener("click", addItemToWardrobe);

function addItemToWardrobe() {
  // --- Validate required fields ---
  if (!stagedImageSrc) {
    setFeedback("Please upload an image first.", "error");
    shakeElement(dropZone);
    return;
  }
  if (!itemTypeEl.value) {
    setFeedback("Please select a category (Top, Bottom, Shoes, or Accessory).", "error");
    shakeElement(itemTypeEl);
    return;
  }
  if (!itemStyleEl.value) {
    setFeedback("Please select a style for this item.", "error");
    shakeElement(itemStyleEl);
    return;
  }

  // --- Build item object ---
  const newItem = {
    id:     ++idCounter,
    image:  stagedImageSrc,
    type:   itemTypeEl.value,          // "top" | "bottom" | "shoes" | "accessory"
    style:  itemStyleEl.value,         // "casual" | "formal" | etc.
    color:  itemColorEl.value.trim().toLowerCase() || null,
    colorHex: itemColorPicker.value,
    weight: itemWeightEl.value,        // "light" | "medium" | "heavy"
    name:   itemNameEl.value.trim() || capitalise(itemTypeEl.value),
    addedAt: Date.now(),
  };

  // --- Save ---
  wardrobe.push(newItem);
  saveWardrobe();

  // --- Update UI ---
  renderWardrobeGrid();
  updateWardrobeCount();
  resetUploadForm();

  // Reset form fields
  itemTypeEl.value  = "";
  itemStyleEl.value = "";
  itemColorEl.value = "";
  itemColorPicker.value = "#3a3a3a";
  itemWeightEl.value = "medium";
  itemNameEl.value  = "";

  setFeedback(`✦ "${newItem.name}" added to your wardrobe!`, "success");
  showToast(`✦ "${newItem.name}" added!`);
}

/* ============================================================
   SECTION 6 — WARDROBE DISPLAY & FILTERING
   ============================================================ */

/** Render all (or filtered) wardrobe items in the grid */
function renderWardrobeGrid() {
  // Filter by active tab
  const items = activeFilter === "all"
    ? wardrobe
    : wardrobe.filter(i => i.type === activeFilter);

  // Clear existing cards (but keep the empty state element)
  Array.from(wardrobeGrid.children).forEach(child => {
    if (!child.id || child.id !== "wardrobeEmpty") child.remove();
  });

  if (items.length === 0) {
    wardrobeEmpty.hidden = false;
    return;
  }
  wardrobeEmpty.hidden = true;

  // Render each item card
  items.forEach(item => {
    const card = createWardrobeCard(item);
    wardrobeGrid.insertBefore(card, wardrobeEmpty);
  });
}

/**
 * Create a wardrobe item card element.
 * @param {Object} item
 * @returns {HTMLElement}
 */
function createWardrobeCard(item) {
  const card = document.createElement("div");
  card.className = "wardrobe-item";
  card.dataset.id = item.id;

  // Build color dot if we have a hex
  const colorDot = item.colorHex
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.colorHex};margin-right:4px;border:1px solid rgba(255,255,255,0.4);"></span>`
    : "";

  card.innerHTML = `
    <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" />
    <div class="wardrobe-item-overlay">
      <div class="item-meta">
        <div class="item-meta-type">${typeLabel(item.type)}</div>
        <div class="item-meta-name">${escapeHtml(item.name)}</div>
        <div class="item-meta-tags">
          <span class="item-tag">${capitalise(item.style)}</span>
          ${item.color ? `<span class="item-tag">${colorDot}${escapeHtml(item.color)}</span>` : ""}
          <span class="item-tag">${capitalise(item.weight)}</span>
        </div>
      </div>
    </div>
    <button class="delete-item-btn" aria-label="Remove ${escapeHtml(item.name)}">✕</button>
  `;

  // Delete button triggers confirmation modal
  card.querySelector(".delete-item-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openDeleteModal(item.id);
  });

  return card;
}

/** Update the wardrobe item count in the header */
function updateWardrobeCount() {
  wardrobeCount.textContent = `${wardrobe.length} item${wardrobe.length !== 1 ? "s" : ""}`;
}

/* Tab filtering */
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderWardrobeGrid();
  });
});

/* ============================================================
   SECTION 7 — DELETE MODAL
   ============================================================ */

function openDeleteModal(id) {
  pendingDeleteId = id;
  modalOverlay.hidden = false;
}

modalCancelBtn.addEventListener("click", () => {
  modalOverlay.hidden = true;
  pendingDeleteId = null;
});

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.hidden = true;
    pendingDeleteId = null;
  }
});

modalConfirmBtn.addEventListener("click", () => {
  if (pendingDeleteId === null) return;
  const item = wardrobe.find(i => i.id === pendingDeleteId);
  wardrobe = wardrobe.filter(i => i.id !== pendingDeleteId);
  saveWardrobe();
  renderWardrobeGrid();
  updateWardrobeCount();
  modalOverlay.hidden = true;
  if (item) showToast(`"${item.name}" removed from wardrobe.`);
  pendingDeleteId = null;
});

/* Clear entire wardrobe */
clearWardrobeBtn.addEventListener("click", () => {
  if (wardrobe.length === 0) { showToast("Your wardrobe is already empty."); return; }
  if (!confirm("Clear your entire wardrobe? This cannot be undone.")) return;
  wardrobe = [];
  saveWardrobe();
  renderWardrobeGrid();
  updateWardrobeCount();
  showToast("Wardrobe cleared.");
});

/* ============================================================
   SECTION 8 — PREFERENCES (CHIPS)
   ============================================================ */

/** Initialise chip-group single-select behaviour */
function initChipGroup(groupEl, onChange) {
  groupEl.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      groupEl.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      onChange(chip.dataset.value);
    });
  });
}

initChipGroup(styleChips,   (val) => { selectedStyle = val; });
initChipGroup(weatherChips, (val) => { selectedWeather = val; });

/* ============================================================
   SECTION 9 — COLOR MATCHING LOGIC
   ============================================================ */

/**
 * Determine the color group name for a given color string.
 * Falls back to "neutrals" when color is unrecognised
 * (neutral matches with everything).
 * @param {string|null} colorStr
 * @returns {string} group name
 */
function getColorGroup(colorStr) {
  if (!colorStr) return "neutrals"; // No color → treat as neutral
  const lower = colorStr.toLowerCase();
  for (const [group, keywords] of Object.entries(COLOR_GROUPS)) {
    if (keywords.some(k => lower.includes(k))) return group;
  }
  return "neutrals"; // Unknown color → safe fallback
}

/**
 * Check whether two color strings are likely to clash.
 * Returns true if the pair is in CLASH_PAIRS OR both are from "bright" group.
 * @param {string|null} colorA
 * @param {string|null} colorB
 * @returns {boolean}
 */
function doColorsClash(colorA, colorB) {
  const groupA = getColorGroup(colorA);
  const groupB = getColorGroup(colorB);
  if (groupA === "neutrals" || groupB === "neutrals") return false;
  if (groupA === groupB) return false; // Same group = fine
  return CLASH_PAIRS.some(
    ([x, y]) => (groupA === x && groupB === y) || (groupA === y && groupB === x)
  );
}

/**
 * Score a set of items for color harmony.
 * Lower score = more clashes (worse), higher = more harmonious.
 * @param {Object[]} items
 * @returns {number}
 */
function scoreColorHarmony(items) {
  let score = 0;
  // Compare every unique pair
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (doColorsClash(items[i].color, items[j].color)) {
        score -= 2; // penalty for clash
      } else {
        score += 1; // bonus for compatible colors
      }
    }
  }
  return score;
}

/* ============================================================
   SECTION 10 — WEATHER FILTERING LOGIC
   ============================================================ */

/**
 * Get weight preference(s) based on selected weather.
 * Returns an array of acceptable weight values.
 * @param {string} weather
 * @returns {string[]}
 */
function getAcceptableWeights(weather) {
  switch (weather) {
    case "hot":  return ["light"];
    case "warm": return ["light", "medium"];
    case "cool": return ["medium", "heavy"];
    case "cold": return ["heavy"];
    default:     return ["light", "medium", "heavy"]; // Any weather
  }
}

/**
 * Filter wardrobe items by weather-appropriate weight.
 * @param {Object[]} items
 * @param {string} weather
 * @returns {Object[]}
 */
function filterByWeather(items, weather) {
  if (!weather) return items; // No preference = include all
  const acceptable = getAcceptableWeights(weather);
  const filtered = items.filter(i => acceptable.includes(i.weight));
  // If filter is too strict and removes everything, return all (graceful fallback)
  return filtered.length > 0 ? filtered : items;
}

/* ============================================================
   SECTION 11 — STYLE FILTERING LOGIC
   ============================================================ */

/**
 * Filter items by preferred style.
 * Matching items are prioritised, but we also allow adjacent styles
 * to prevent impossible outfit generation when wardrobe is sparse.
 *
 * Style adjacency map: styles that can mix well.
 */
const STYLE_ADJACENCY = {
  casual:   ["casual", "sporty", "boho"],
  formal:   ["formal", "business"],
  party:    ["party", "formal"],
  sporty:   ["sporty", "casual"],
  business: ["business", "formal", "casual"],
  boho:     ["boho", "casual"],
};

/**
 * Filter wardrobe items by style preference.
 * If strict filter leaves no items for a category, we relax the filter.
 * @param {Object[]} items
 * @param {string} stylePreference
 * @returns {Object[]}
 */
function filterByStyle(items, stylePreference) {
  if (!stylePreference) return items;
  const adjacent = STYLE_ADJACENCY[stylePreference] || [stylePreference];
  const strict   = items.filter(i => i.style === stylePreference);
  const relaxed  = items.filter(i => adjacent.includes(i.style));
  // Prefer strict match, fallback to adjacent styles, then all
  if (strict.length > 0)   return strict;
  if (relaxed.length > 0)  return relaxed;
  return items;
}

/* ============================================================
   SECTION 12 — OUTFIT GENERATION LOGIC (Core)
   ============================================================ */

/**
 * Main generate function.
 * Picks one item per required category (top, bottom, shoes)
 * and optionally an accessory, then scores colour harmony
 * across multiple candidate combinations before returning the best.
 */
function generateOutfit() {
  // --- Validate wardrobe has minimum required pieces ---
  const tops      = wardrobe.filter(i => i.type === "top");
  const bottoms   = wardrobe.filter(i => i.type === "bottom");
  const shoes     = wardrobe.filter(i => i.type === "shoes");
  const accessory = wardrobe.filter(i => i.type === "accessory");

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    showToast("Please add at least one Top, one Bottom, and one pair of Shoes.", 4000);
    return null;
  }

  // --- Apply weather filter to each category ---
  const wTops      = filterByWeather(tops,      selectedWeather);
  const wBottoms   = filterByWeather(bottoms,    selectedWeather);
  const wShoes     = filterByWeather(shoes,      selectedWeather);
  const wAccessory = filterByWeather(accessory,  selectedWeather);

  // --- Apply style filter to each category ---
  const sTops      = filterByStyle(wTops,      selectedStyle);
  const sBottoms   = filterByStyle(wBottoms,    selectedStyle);
  const sShoes     = filterByStyle(wShoes,      selectedStyle);
  const sAccessory = filterByStyle(wAccessory,  selectedStyle);

  // --- Generate N candidate outfits and pick the one with best color harmony ---
  const NUM_CANDIDATES = 12;
  let bestOutfit = null;
  let bestScore  = -Infinity;

  for (let attempt = 0; attempt < NUM_CANDIDATES; attempt++) {
    const candidate = [
      pickRandom(sTops),
      pickRandom(sBottoms),
      pickRandom(sShoes),
    ];

    // Optionally add accessory (70% chance if available)
    if (sAccessory.length > 0 && Math.random() < 0.7) {
      candidate.push(pickRandom(sAccessory));
    }

    const score = scoreColorHarmony(candidate);

    if (score > bestScore) {
      bestScore  = score;
      bestOutfit = candidate;
    }
  }

  return bestOutfit;
}

/* ============================================================
   SECTION 13 — STYLING TIP SELECTION
   ============================================================ */

/**
 * Pick a contextually relevant styling tip based on the
 * generated outfit's style and selected weather.
 * @param {Object[]} outfitItems
 * @returns {string}
 */
function pickStylingTip(outfitItems) {
  // Determine dominant style (most common among pieces)
  const styleCounts = {};
  outfitItems.forEach(item => {
    styleCounts[item.style] = (styleCounts[item.style] || 0) + 1;
  });
  const dominantStyle = Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  // Try specific key first, then style-only, then fallback
  const specificKey  = `${dominantStyle}-${selectedWeather}`;
  const styleKey     = `${dominantStyle}-warm`; // generic middle-ground weather key
  const pool =
    STYLING_TIPS[specificKey] ||
    STYLING_TIPS[styleKey]    ||
    STYLING_TIPS["fallback"];

  return pickRandom(pool);
}

/* ============================================================
   SECTION 14 — OUTPUT RENDERING
   ============================================================ */

generateBtn.addEventListener("click", handleGenerate);
regenerateBtn.addEventListener("click", handleGenerate);

/** Handle generate button click */
function handleGenerate() {
  // Provide loading feedback
  generateBtn.classList.add("loading");

  // Use a tiny timeout so the UI updates before we do heavy work
  setTimeout(() => {
    const outfit = generateOutfit();
    if (!outfit) {
      generateBtn.classList.remove("loading");
      return;
    }
    renderOutput(outfit);
    generateBtn.classList.remove("loading");
  }, 350);
}

/** Render the outfit output section */
function renderOutput(items) {
  // Build badges
  outfitBadges.innerHTML = "";
  if (selectedStyle) {
    outfitBadges.insertAdjacentHTML("beforeend",
      `<span class="outfit-badge badge-style">✦ ${capitalise(selectedStyle)}</span>`);
  }
  if (selectedWeather) {
    outfitBadges.insertAdjacentHTML("beforeend",
      `<span class="outfit-badge badge-weather">${weatherLabel(selectedWeather)}</span>`);
  }
  if (!selectedStyle && !selectedWeather) {
    outfitBadges.insertAdjacentHTML("beforeend",
      `<span class="outfit-badge badge-style">✦ Random Look</span>`);
  }

  // Build outfit cards
  outfitGrid.innerHTML = "";
  items.forEach(item => {
    const piece = document.createElement("div");
    piece.className = "outfit-piece";
    const colorDot = item.colorHex
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.colorHex};margin-right:4px;border:1px solid rgba(0,0,0,0.15);vertical-align:middle;"></span>`
      : "";
    piece.innerHTML = `
      <div class="outfit-piece-img-wrap">
        <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" />
      </div>
      <div class="outfit-piece-category">${typeLabel(item.type)}</div>
      <div class="outfit-piece-name">${escapeHtml(item.name)}</div>
      <div class="outfit-piece-tags">
        <span class="outfit-piece-tag">${capitalise(item.style)}</span>
        ${item.color ? `<span class="outfit-piece-tag">${colorDot}${escapeHtml(item.color)}</span>` : ""}
        <span class="outfit-piece-tag">${capitalise(item.weight)}</span>
      </div>
    `;
    outfitGrid.appendChild(piece);
  });

  // Styling tip
  tipText.textContent = pickStylingTip(items);

  // Reveal output section
  outputSection.hidden = false;
  // Smooth scroll to output
  setTimeout(() => {
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

/* ============================================================
   SECTION 15 — SCROLL-UP BUTTON
   ============================================================ */

scrollUpBtn.addEventListener("click", () => {
  document.getElementById("uploadSection").scrollIntoView({ behavior: "smooth" });
});

/* ============================================================
   SECTION 16 — COLOR PICKER SYNC
   ============================================================ */

/** When color picker changes, populate the text field with a formatted name */
itemColorPicker.addEventListener("input", () => {
  // Only auto-fill if text field is empty
  if (!itemColorEl.value.trim()) {
    itemColorEl.value = hexToColorName(itemColorPicker.value);
  }
});

/**
 * Very basic hex-to-approximate-name heuristic.
 * Good enough for styling hints.
 * @param {string} hex e.g. "#3a5f8c"
 * @returns {string}
 */
function hexToColorName(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 230) return "white";
  if (brightness < 30)  return "black";

  // Dominant channel heuristic
  const max = Math.max(r, g, b);
  const diff = 60;

  if (r - g > diff && r - b > diff) return "red";
  if (g - r > diff && g - b > diff) return "green";
  if (b - r > diff && b - g > diff) return "blue";
  if (r > 200 && g > 150 && b < 100) return "orange";
  if (r > 200 && g > 200 && b < 80)  return "yellow";
  if (r > 150 && b > 150 && g < 100) return "purple";
  if (r > 200 && g < 100 && b > 150) return "pink";
  if (r < 100 && g > 100 && b > 120) return "teal";
  if (r > 100 && g > 80 && b < 50)   return "brown";
  if (brightness > 170) return "light grey";
  if (brightness > 80)  return "grey";
  return "dark";
}

/* ============================================================
   SECTION 17 — UTILITY FUNCTIONS
   ============================================================ */

/**
 * Pick a random element from an array.
 * @param {any[]} arr
 * @returns {any}
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Capitalise first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Return a human-readable label for clothing type.
 * @param {string} type
 * @returns {string}
 */
function typeLabel(type) {
  const labels = { top: "Top", bottom: "Bottom", shoes: "Shoes", accessory: "Accessory" };
  return labels[type] || capitalise(type);
}

/**
 * Return a human-readable label for weather.
 * @param {string} weather
 * @returns {string}
 */
function weatherLabel(weather) {
  const labels = { hot: "☀️ Hot", warm: "🌤 Warm", cool: "🍂 Cool", cold: "❄️ Cold" };
  return labels[weather] || capitalise(weather);
}

/**
 * Set the upload feedback message.
 * @param {string} msg
 * @param {"success"|"error"|""} type
 */
function setFeedback(msg, type) {
  uploadFeedback.textContent = msg;
  uploadFeedback.className = `upload-feedback ${type}`;
}

/**
 * Show a toast notification.
 * @param {string} msg
 * @param {number} [duration=2500] ms
 */
let toastTimer = null;
function showToast(msg, duration = 2500) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

/**
 * Shake an element briefly to signal validation error.
 * @param {HTMLElement} el
 */
function shakeElement(el) {
  el.style.animation = "none";
  el.offsetHeight; // reflow
  el.style.animation = "shake 0.4s ease";
  setTimeout(() => (el.style.animation = ""), 400);
}

/* Inject shake keyframe if not present */
(function injectShakeAnimation() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-6px); }
      40%       { transform: translateX(6px); }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
})();

/* ============================================================
   SECTION 18 — INITIALISATION
   ============================================================ */

/**
 * Bootstrap the application.
 * Called once on DOMContentLoaded.
 */
function init() {
  // 1. Load saved wardrobe from localStorage
  loadWardrobe();

  // 2. Render existing wardrobe items
  renderWardrobeGrid();

  // 3. Update header count
  updateWardrobeCount();

  // 4. Log startup info
  console.log(`StyleMate initialised. Wardrobe has ${wardrobe.length} item(s).`);
}

// Run on page load
document.addEventListener("DOMContentLoaded", init);
