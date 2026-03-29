const loadingCanvas = document.getElementById('loadingCanvas');
const loadingCtx = loadingCanvas.getContext('2d');
loadingCanvas.width = window.innerWidth;
loadingCanvas.height = window.innerHeight;

const photoFolder = "/assets/photos";
const imageMaxSize = 450;
const stackYOffset = -120;
let loadedImages = []; // stores { img, scale, rotation, offsetX, offsetY }
let photosToLoad = []; // list of filenames to load

// Load a single image and store its random placement/rotation
function loadImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      const scale = Math.min(imageMaxSize / img.width, imageMaxSize / img.height);

      // random rotation in radians (-15 to +15 deg)
      const rotation = (Math.random() - 0.5) * (30 * Math.PI / 180);
      // small random offsets (-10 to +10 px)
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;

      loadedImages.push({ img, scale, rotation, offsetX, offsetY });
      drawStackedPhotos();
      resolve(img);
    };
    img.onerror = () => resolve(null);
  });
}

// Draw all photos stacked in the center
function drawStackedPhotos() {
  loadingCtx.clearRect(0, 0, loadingCanvas.width, loadingCanvas.height);

  const centerX = loadingCanvas.width / 2;
  const centerY = loadingCanvas.height / 2 + stackYOffset;

  loadedImages.forEach(photo => {
    const w = photo.img.width * photo.scale;
    const h = photo.img.height * photo.scale;

    loadingCtx.save();
    loadingCtx.translate(centerX + photo.offsetX, centerY + photo.offsetY);
    loadingCtx.rotate(photo.rotation);
    loadingCtx.drawImage(photo.img, -w / 2, -h / 2, w, h);
    loadingCtx.restore();
  });

  // Update loading text
  const loadingTextEl = document.getElementById('loadingText');
  if (loadingTextEl) {
    loadingTextEl.innerText = `Loading photos... ${loadedImages.length} / ${photosToLoad.length}`;
  }
}

// Load all photos sequentially
async function loadAllPhotos() {
  try {
    const response = await fetch("/data/photos.json");
    const photos = await response.json();
    photosToLoad = photos.map(p => p.filename);

    for (const file of photosToLoad) {
      await loadImage(`/assets/photos/${file}`);
    }

    // Fade out and remove loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.transition = 'opacity 0.5s';
      loadingScreen.style.opacity = 0;
      setTimeout(() => loadingScreen.remove(), 500);
    }
  } catch (err) {
    console.error("Failed to load photos.json:", err);
  }
}

// Resize handler
window.addEventListener('resize', () => {
  loadingCanvas.width = window.innerWidth;
  loadingCanvas.height = window.innerHeight;
  drawStackedPhotos();
});

// Start loading
loadAllPhotos();