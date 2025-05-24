let coverImage = null;

document.getElementById("cover-upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    coverImage = new Image();
    coverImage.onload = () => {
      console.log("Cover image loaded.");
      render();
    };
    coverImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

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

  // ✅ Draw image if loaded
  if (coverImage && coverImage.complete) {
    const size = 600;
    ctx.drawImage(coverImage, 60, 40, size, size);
  }

  let textStartY = coverImage ? 680 : 60;

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
