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

function extractColors() {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  const size = 100;

  tempCanvas.width = size;
  tempCanvas.height = size;
  tempCtx.drawImage(coverImage, 0, 0, size, size);

  const data = tempCtx.getImageData(0, 0, size, size).data;
  const colorMap = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const hex = rgbToHex(r, g, b);
    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }

  // Sort by most frequent
  const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]);
  colorPalette = sorted.slice(0, 5).map(entry => entry[0]);
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x =>
    x.toString(16).padStart(2, "0")
  ).join("");
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}

function render() {
  const canvas = document.getElementById('poster');
  const ctx = canvas.getContext('2d');
  const album = document.getElementById('album').value;
  const artist = document.getElementById('artist').value;
  const year = document.getElementById('year').value;
  const tracks = document.getElementById('tracks').value.split('\n');
  const font = document.getElementById('font').value;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let textStartY = 60;

  if (coverImage && coverImage.complete) {
    const size = 600;
    ctx.drawImage(coverImage, 60, 40, size, size);

    //  Draw color palette
    const swatchX = 60;
    const swatchY = 660;
    const swatchSize = 40;
    const spacing = 10;

    colorPalette.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(swatchX + i * (swatchSize + spacing), swatchY, swatchSize, swatchSize);
    });

    textStartY = 730;
  }

  ctx.fillStyle = '#000';
  ctx.font = `bold 36px ${font}`;
  ctx.fillText(album, 40, textStartY);

  ctx.font = `24px ${font}`;
  ctx.fillText(`${artist} (${year})`, 40, textStartY + 40);

  ctx.font = `18px ${font}`;
  let y = textStartY + 90;
  for (let track of tracks) {
    if (track.trim()) {
      y = wrapText(ctx, track.trim(), 40, y, 640, 26);
    }
  }
}

function exportPoster() {
  const canvas = document.getElementById('poster');
  const link = document.createElement('a');
  link.download = 'poster.png';
  link.href = canvas.toDataURL();
  link.click();
}
