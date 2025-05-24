let coverImage = null;
let colorPalette = [];

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

function render() {
  const canvas = document.getElementById("poster");
  const ctx = canvas.getContext("2d");

  const album = document.getElementById("album").value;
  const artist = document.getElementById("artist").value;
  const year = document.getElementById("year").value;
  const tracks = document.getElementById("tracks").value.split("\n").filter(t => t.trim());
  const font = document.getElementById("font").value;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = 60;
  const centerX = canvas.width / 2;

  // Album art
  if (coverImage && coverImage.complete) {
    const size = 600;
    ctx.drawImage(coverImage, centerX - size / 2, y, size, size);
    y += size + 20;
  }

  // Metadata row layout
  const padding = 40;
  const blockWidth = (canvas.width - padding * 2) / 2;

  // Right side: artist + colors
  const swatchSize = 30;
  const spacing = 8;
  const totalSwatchWidth = colorPalette.length * (swatchSize + spacing) - spacing;
  const rightX = canvas.width - padding;

  // Text height control
  let albumFontSize = 40;
  const artistFontSize = 20;
  const blockHeight = Math.max(swatchSize, artistFontSize) + 10;

  // Resize album name if it would collide
  ctx.font = `bold ${albumFontSize}px ${font}`;
  while (ctx.measureText(album).width > blockWidth - 20 && albumFontSize > 20) {
    albumFontSize -= 2;
    ctx.font = `bold ${albumFontSize}px ${font}`;
  }

  // Album name and year
  ctx.textAlign = "left";
  ctx.fillStyle = "#000";
  ctx.font = `bold ${albumFontSize}px ${font}`;
  ctx.fillText(album, padding, y + blockHeight);

  ctx.font = `20px ${font}`;
  ctx.fillText(year, padding, y + blockHeight + 24);

  // Colors and artist
  let startX = rightX - totalSwatchWidth;
  ctx.textAlign = "right";

  colorPalette.forEach((color, i) => {
    const x = startX + i * (swatchSize + spacing);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + blockHeight - swatchSize, swatchSize, swatchSize);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(x, y + blockHeight - swatchSize, swatchSize, swatchSize);
  });

  ctx.font = `bold ${artistFontSize}px ${font}`;
  ctx.fillStyle = "#000";
  ctx.fillText(artist, rightX, y + blockHeight + 24);

  y += blockHeight + 60;

  // Divider
  ctx.fillStyle = "#000";
  ctx.fillRect(padding, y, canvas.width - 2 * padding, 4);
  y += 30;

  // Tracklist: max 3 columns, wrap if needed
  const columnMax = 3;
  const columnWidth = (canvas.width - padding * 2) / columnMax;
  const lineHeight = 26;

  let trackFontSize = 18;
  const trackAreaHeight = canvas.height - y - 30;
  let linesPerCol = Math.floor(trackAreaHeight / lineHeight);
  let requiredCols = Math.ceil(tracks.length / linesPerCol);

  while (requiredCols > columnMax && trackFontSize > 10) {
    trackFontSize -= 1;
    linesPerCol = Math.floor(trackAreaHeight / (trackFontSize + 6));
    requiredCols = Math.ceil(tracks.length / linesPerCol);
  }

  ctx.font = `${trackFontSize}px ${font}`;
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";

  for (let i = 0; i < tracks.length; i++) {
    const col = Math.floor(i / linesPerCol);
    const row = i % linesPerCol;

    const x = padding + col * columnWidth;
    const trackY = y + row * (trackFontSize + 6);

    ctx.fillText(tracks[i].trim(), x, trackY);
  }
}

function exportPoster() {
  const canvas = document.getElementById("poster");
  const link = document.createElement("a");
  link.download = "poster.png";
  link.href = canvas.toDataURL();
  link.click();
}

async function fetchSpotifyToken() {
    const res = await fetch("api/token.json");
    const data = await res.json();
    return data.access_token;
}

async function selectAlbum(album) {
    document.getElementById("album").value = album.name;
    document.getElementById("artist").value = album.artists[0].name;
    document.getElementById("year").value = album.release_date.slice(0, 4);


    const resultsList = document.getElementById("search-results");
    resultsList.innerHTML = "";

    // Load tracklist
    const token = await fetchSpotifyToken();
    const res = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    const textarea = document.querySelector("textarea");
    textarea.value = data.items.map(track =>
        `${track.name} - ${Math.floor(track.duration_ms / 60000)
            .toString().padStart(2, "0")}:${Math.floor((track.duration_ms % 60000) / 1000)
            .toString().padStart(2, "0")}`
    ).join("\n");

    // Set album image
    const fileInput = document.querySelector('input[type="file"]');
    const response = await fetch(album.images[0].url);
    const blob = await response.blob();
    const file = new File([blob], "cover.jpg", { type: "image/jpeg" });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
}

document.getElementById("spotify-search").addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    const resultsList = document.getElementById("search-results");
    resultsList.innerHTML = "";

    if (query.length < 3) return;

    const token = await fetchSpotifyToken();

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=5`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
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
