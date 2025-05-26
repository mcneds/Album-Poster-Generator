let coverImage = null;
let colorPalette = [];
let manualFontSize = false;
let manualCols = false;
let activelyEditingFontSize = false;
let activelyEditingCols = false;

document.getElementById("cover-upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    coverImage = new Image();
    coverImage.onload = () => {
      extractColors();
      render();
    };
    coverImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

async function fetchSpotifyToken() {
  const res = await fetch("api/token.json");
  const data = await res.json();
  return data.access_token;
}

function quantize(value, step) {
  return Math.round(value / step) * step;
}

function extractColors() {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  const size = 100;
  const step = 32;

  tempCanvas.width = size;
  tempCanvas.height = size;
  tempCtx.drawImage(coverImage, 0, 0, size, size);

  const data = tempCtx.getImageData(0, 0, size, size).data;
  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 245 && g > 245 && b > 245) continue;
    if (r < 15 && g < 15 && b < 15) continue;

    const qr = quantize(r, step);
    const qg = quantize(g, step);
    const qb = quantize(b, step);
    const key = `${qr},${qg},${qb}`;

    if (!buckets.has(key)) {
      buckets.set(key, { count: 0, r: 0, g: 0, b: 0 });
    }

    const bucket = buckets.get(key);
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
  }

  const sorted = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count);
  colorPalette = sorted.slice(0, 5).map(([_, bucket]) => {
    const avgR = Math.round(bucket.r / bucket.count);
    const avgG = Math.round(bucket.g / bucket.count);
    const avgB = Math.round(bucket.b / bucket.count);
    return rgbToHex(avgR, avgG, avgB);
  });

  if (colorPalette.length === 0) {
    colorPalette = ['#ccc', '#888', '#444', '#000', '#fff'];
  }
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x =>
    x.toString(16).padStart(2, "0")
  ).join("");
}

function getContrastYIQ(hexcolor) {
  const r = parseInt(hexcolor.substr(1,2),16);
  const g = parseInt(hexcolor.substr(3,2),16);
  const b = parseInt(hexcolor.substr(5,2),16);
  const yiq = (r*299 + g*587 + b*114)/1000;
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

function render() {
  const canvas = document.getElementById("poster");
  const ctx = canvas.getContext("2d");

  const album = document.getElementById("album").value;
  const artist = document.getElementById("artist").value;
  const year = document.getElementById("year").value;
  const tracks = document.getElementById("tracks").value.split("\n").filter(t => t.trim());
  const showDurations = document.getElementById("toggle-duration").checked;
  const font = document.getElementById("font").value;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let bgColor = "#ffffff";
  const bgMode = document.getElementById("bg-color-mode").value;
  if (bgMode === "picker") {
    bgColor = document.getElementById("bg-color-picker").value;
  } else if (colorPalette.length > 0) {
    bgColor = colorPalette[0];
  }
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let textColor = "#000000";
  const textMode = document.getElementById("text-color-mode").value;
  if (textMode === "picker") {
    textColor = document.getElementById("text-color-picker").value;
  } else {
    textColor = getContrastYIQ(bgColor);
  }

  let y = 60;
  const centerX = canvas.width / 2;

  if (coverImage && coverImage.complete) {
    const size = 600;
    ctx.drawImage(coverImage, centerX - size / 2, y, size, size);
    y += size + 20;
  }

  const padding = 40;
  const blockWidth = (canvas.width - padding * 2) / 2;

  const swatchSize = 30;
  const spacing = 8;
  const totalSwatchWidth = colorPalette.length * (swatchSize + spacing) - spacing;
  const rightX = canvas.width - padding;

  let albumFontSize = 40;
  const artistFontSize = 20;
  const blockHeight = Math.max(swatchSize, artistFontSize) + 10;

  ctx.font = `bold ${albumFontSize}px ${font}`;
  while (ctx.measureText(album).width > blockWidth - 20 && albumFontSize > 20) {
    albumFontSize -= 2;
    ctx.font = `bold ${albumFontSize}px ${font}`;
  }

  ctx.textAlign = "left";
  ctx.fillStyle = textColor;
  ctx.font = `bold ${albumFontSize}px ${font}`;
  ctx.fillText(album, padding, y + blockHeight);
  ctx.font = `20px ${font}`;
  ctx.fillText(year, padding, y + blockHeight + 24);

  let startX = rightX - totalSwatchWidth;
  ctx.textAlign = "right";

  colorPalette.forEach((color, i) => {
    const x = startX + i * (swatchSize + spacing);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + blockHeight - swatchSize, swatchSize, swatchSize);
    ctx.strokeStyle = textColor;
    ctx.strokeRect(x, y + blockHeight - swatchSize, swatchSize, swatchSize);
  });

  ctx.font = `bold ${artistFontSize}px ${font}`;
  ctx.fillStyle = textColor;
  ctx.fillText(artist, rightX, y + blockHeight + 24);

  y += blockHeight + 60;
  ctx.fillStyle = textColor;
  ctx.fillRect(padding, y, canvas.width - 2 * padding, 4);
  y += 30;

  const columnSpacing = 20;
  const trackAreaHeight = canvas.height - y - 30;

  const fontSizeInputEl = document.getElementById("track-font-size");
  const colsInputEl = document.getElementById("track-cols");

  const fontSizeInput = fontSizeInputEl.value.trim();
  const colsInput = colsInputEl.value.trim();

  const userFontSizeRaw = fontSizeInput === "" ? 0 : parseInt(fontSizeInput, 10);
  const userColsRaw = colsInput === "" ? 0 : parseInt(colsInput, 10);

  const userWantsFontSize = userFontSizeRaw > 0;
  const userWantsCols = userColsRaw > 0;

  let fontSize = 10;
  let numCols = 3;
  let linesPerCol = 1;
  let bestSize = 10;
  let bestCols = 3;

  if (userWantsFontSize && userWantsCols) {
    fontSize = userFontSizeRaw;
    numCols = userColsRaw;
    linesPerCol = Math.floor(trackAreaHeight / (fontSize + 6));
  } else {
    for (let cols = 1; cols <= 3; cols++) {
      for (let size = 36; size >= 10; size--) {
        const lineHeight = size + 6;
        const lines = Math.floor(trackAreaHeight / lineHeight);
        if (lines * cols >= tracks.length) {
          fontSize = size;
          numCols = cols;
          linesPerCol = lines;
          bestSize = size;
          bestCols = cols;
          break;
        }
      }
      if (fontSize > 10) break;
    }
    if (!manualFontSize && !activelyEditingFontSize) fontSizeInputEl.value = bestSize;
    if (!manualCols && !activelyEditingCols) colsInputEl.value = bestCols;
  }

  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";

  for (let i = 0; i < tracks.length; i++) {
    const col = Math.floor(i / linesPerCol);
    const row = i % linesPerCol;
    const colWidth = (canvas.width - padding * 2 - (numCols - 1) * columnSpacing) / numCols;
    const x = padding + col * (colWidth + columnSpacing);
    const trackY = y + row * (fontSize + 6);

    let trackLine = tracks[i].trim();
    if (!showDurations && trackLine.includes(" - ")) {
      trackLine = trackLine.split(" - ")[0];
    }

    ctx.fillText(trackLine, x, trackY);
  }
}

async function selectAlbum(album) {
  document.getElementById("album").value = album.name;
  document.getElementById("artist").value = album.artists[0].name;
  document.getElementById("year").value = album.release_date.slice(0, 4);

  const resultsList = document.getElementById("search-results");
  resultsList.innerHTML = "";

  const token = await fetchSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  document.getElementById("tracks").value = data.items.map(track =>
    `${track.name} - ${Math.floor(track.duration_ms / 60000).toString().padStart(2, "0")}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, "0")}`
  ).join("\n");

  const response = await fetch(album.images[0].url);
  const blob = await response.blob();
  const reader = new FileReader();
  reader.onload = function (event) {
    coverImage = new Image();
    coverImage.onload = () => {
      extractColors();
      render();
    };
    coverImage.src = event.target.result;
  };
  reader.readAsDataURL(blob);
}

function exportPoster() {
  const album = document.getElementById("album").value.trim().replace(/[^a-z0-9]+/gi, "_");
  const artist = document.getElementById("artist").value.trim().replace(/[^a-z0-9]+/gi, "_");
  const filename = `${artist || "artist"}_${album || "album"}_poster.png`;

  // Get desired export resolution
  let width, height;
  const res = document.getElementById("export-res").value;
  if (res === "custom") {
    width = parseInt(document.getElementById("custom-width").value, 10) || 720;
    height = parseInt(document.getElementById("custom-height").value, 10) || 1080;
  } else {
    [width, height] = res.split("x").map(Number);
  }

  // Create a temporary canvas at target resolution
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext("2d");

  // Scale render to temp canvas
  const originalCanvas = document.getElementById("poster");
  const scaleX = width / originalCanvas.width;
  const scaleY = height / originalCanvas.height;

  ctx.scale(scaleX, scaleY);
  ctx.drawImage(originalCanvas, 0, 0);

  // Export
  const link = document.createElement("a");
  link.download = filename;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}



document.getElementById("track-font-size").addEventListener("input", () => {
  manualFontSize = true;
  activelyEditingFontSize = true;
  render();
});
document.getElementById("track-cols").addEventListener("input", () => {
  manualCols = true;
  activelyEditingCols = true;
  render();
});
document.getElementById("track-font-size").addEventListener("blur", () => {
  activelyEditingFontSize = false;
  render();
});
document.getElementById("track-cols").addEventListener("blur", () => {
  activelyEditingCols = false;
  render();
});

document.getElementById("spotify-search").addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  const resultsList = document.getElementById("search-results");
  resultsList.innerHTML = "";

  if (query.length < 3) return;

  const token = await fetchSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=5`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const albums = data.albums?.items || [];

  albums.forEach(album => {
    const li = document.createElement("li");
    li.textContent = `${album.name} – ${album.artists[0].name} (${album.release_date.slice(0, 4)})`;
    li.addEventListener("click", () => selectAlbum(album));
    resultsList.appendChild(li);
  });
});

document.getElementById("spotify-search").addEventListener("blur", () => {
  setTimeout(() => {
    document.getElementById("search-results").innerHTML = "";
  }, 200);
});

document.getElementById("bg-color-mode").addEventListener("change", () => {
  document.getElementById("bg-color-picker").style.display =
    document.getElementById("bg-color-mode").value === "picker" ? "inline-block" : "none";
  render();
});

document.getElementById("text-color-mode").addEventListener("change", () => {
  document.getElementById("text-color-picker").style.display =
    document.getElementById("text-color-mode").value === "picker" ? "inline-block" : "none";
  render();
});

document.getElementById("bg-color-picker").addEventListener("input", render);
document.getElementById("text-color-picker").addEventListener("input", render);

document.getElementById("export-res").addEventListener("change", () => {
  const customWrapper = document.getElementById("custom-res-wrapper");
  customWrapper.style.display = document.getElementById("export-res").value === "custom" ? "block" : "none";
});
