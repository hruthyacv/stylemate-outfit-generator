"use strict";

/* ===== STATE ===== */
let wardrobe = JSON.parse(localStorage.getItem("stylemate_wardrobe")) || [];
let savedOutfits = JSON.parse(localStorage.getItem("saved_outfits")) || [];

let selectedStyle = "";
let selectedWeather = "";

/* ===== DOM ===== */
const generateBtn = document.getElementById("generateBtn");
const outputSection = document.getElementById("outputSection");
const outfitGrid = document.getElementById("outfitGrid");
const outfitBadges = document.getElementById("outfitBadges");
const tipText = document.getElementById("tipText");
const saveBtn = document.getElementById("saveOutfitBtn");
const modalOverlay = document.getElementById("modalOverlay");

/* ===== FIX: MODAL BUG ===== */
document.addEventListener("DOMContentLoaded", () => {
modalOverlay.hidden = true;
});

/* ===== UTIL ===== */
function pickRandom(arr) {
return arr[Math.floor(Math.random() * arr.length)];
}

/* ===== COLOR SCORE (simplified from your logic) ===== */
function scoreColorHarmony(items) {
let score = 0;
for (let i = 0; i < items.length; i++) {
for (let j = i + 1; j < items.length; j++) {
if (items[i].color === items[j].color) score += 2;
else score += 1;
}
}
return score;
}

/* ===== GENERATE ===== */
function generateOutfit() {
const tops = wardrobe.filter(i => i.type === "top");
const bottoms = wardrobe.filter(i => i.type === "bottom");
const shoes = wardrobe.filter(i => i.type === "shoes");

if (!tops.length || !bottoms.length || !shoes.length) {
alert("Add at least one top, bottom, and shoes");
return null;
}

const outfit = [
pickRandom(tops),
pickRandom(bottoms),
pickRandom(shoes)
];

return {
items: outfit,
score: scoreColorHarmony(outfit)
};
}

/* ===== EXPLANATION ===== */
function explain(score) {
if (score > 4) return "Excellent color harmony and balance.";
if (score > 2) return "Good outfit with decent matching.";
return "Bold mix — high contrast styling.";
}

/* ===== RENDER ===== */
function renderOutput(items, score) {
outfitGrid.innerHTML = "";
outfitBadges.innerHTML = "";

items.forEach(item => {
const div = document.createElement("div");
div.innerHTML = `<img src="${item.image}" style="width:100%">`;
outfitGrid.appendChild(div);
});

outfitBadges.innerHTML = `<span>Score: ${score}</span>`;
tipText.textContent = explain(score);

outputSection.hidden = false;

/* SAVE BUTTON */
saveBtn.onclick = () => {
savedOutfits.push(items);
localStorage.setItem("saved_outfits", JSON.stringify(savedOutfits));
alert("Outfit saved!");
};
}

/* ===== EVENT ===== */
generateBtn.addEventListener("click", () => {
const result = generateOutfit();
if (!result) return;
renderOutput(result.items, result.score);
});
