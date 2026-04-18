let photosToLoad = [];
let totalPhotos = 0;
let loadedPhotos = 0;
let overlayHidden = false;
let animationFrameId = null;
let startTime = performance.now();
let loadingTreeFinished = false;
let maxLoadingNodes = 240;

const loadingAttractors = [];
const loadingNodes = [];

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const loadingCanvas = document.getElementById("loadingCanvas");
const ctx = loadingCanvas.getContext("2d");

class LoadingNode {
  constructor(x, y, parent = null) {
    this.x = x;
    this.y = y;
    this.parent = parent;
    this.directionX = 0;
    this.directionY = 0;
    this.count = 0;
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  loadingCanvas.width = Math.floor(window.innerWidth * dpr);
  loadingCanvas.height = Math.floor(window.innerHeight * dpr);
  loadingCanvas.style.width = `${window.innerWidth}px`;
  loadingCanvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initializeLoadingTree();
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function initializeLoadingTree() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rootX = width * 0.5;
  const rootY = height * 0.82;
  const canopyCenterY = height * 0.34;

  loadingAttractors.length = 0;
  loadingNodes.length = 0;
  loadingTreeFinished = false;

  const trunkStep = Math.max(12, Math.min(width, height) * 0.028);
  let trunkNode = new LoadingNode(rootX, rootY);
  loadingNodes.push(trunkNode);

  while (trunkNode.y > canopyCenterY + trunkStep * 1.5) {
    const nextNode = new LoadingNode(rootX, trunkNode.y - trunkStep, trunkNode);
    loadingNodes.push(nextNode);
    trunkNode = nextNode;
  }

  const canopyWidth = Math.min(width * 0.42, 420);
  const canopyHeight = Math.min(height * 0.34, 260);
  const attractorCount = Math.max(80, Math.min(220, totalPhotos || 140));

  for (let i = 0; i < attractorCount; i++) {
    let x = rootX;
    let y = canopyCenterY;
    let placed = false;

    for (let tries = 0; tries < 24; tries++) {
      const rx = (Math.random() * 2 - 1) * canopyWidth;
      const ry = (Math.random() * 2 - 1) * canopyHeight;
      const ellipse = (rx * rx) / (canopyWidth * canopyWidth) + (ry * ry) / (canopyHeight * canopyHeight);

      if (ellipse > 1) {
        continue;
      }

      x = rootX + rx;
      y = canopyCenterY + ry;

      const trunkBias = Math.abs(x - rootX) < 28 && y > canopyCenterY - canopyHeight * 0.1;
      if (trunkBias) {
        continue;
      }

      placed = true;
      break;
    }

    if (placed) {
      loadingAttractors.push({ x, y, consumed: false });
    }
  }
}

function getLoadingTreeParams() {
  const base = Math.min(window.innerWidth, window.innerHeight);
  return {
    influenceDistance: Math.max(38, base * 0.11),
    killDistance: Math.max(12, base * 0.026),
    stepSize: Math.max(8, base * 0.022),
  };
}

function growLoadingTree() {
  if (loadingTreeFinished || loadingNodes.length >= maxLoadingNodes) {
    loadingTreeFinished = true;
    return;
  }

  const activeAttractors = loadingAttractors.filter(attractor => !attractor.consumed);

  if (activeAttractors.length === 0) {
    loadingTreeFinished = true;
    return;
  }

  const { influenceDistance, killDistance, stepSize } = getLoadingTreeParams();

  loadingNodes.forEach(node => {
    node.directionX = 0;
    node.directionY = 0;
    node.count = 0;
  });

  for (const attractor of activeAttractors) {
    let closestNode = null;
    let closestDist = Infinity;

    for (const node of loadingNodes) {
      const dx = attractor.x - node.x;
      const dy = attractor.y - node.y;
      const dist = Math.hypot(dx, dy);

      if (dist < killDistance) {
        attractor.consumed = true;
        closestNode = null;
        break;
      }

      if (dist < influenceDistance && dist < closestDist) {
        closestNode = node;
        closestDist = dist;
      }
    }

    if (closestNode) {
      const dx = attractor.x - closestNode.x;
      const dy = attractor.y - closestNode.y;
      const invLength = 1 / Math.max(Math.hypot(dx, dy), 0.0001);
      closestNode.directionX += dx * invLength;
      closestNode.directionY += dy * invLength;
      closestNode.count += 1;
    }
  }

  const newNodes = [];

  for (const node of loadingNodes) {
    if (node.count === 0) {
      continue;
    }

    const dirX = node.directionX / node.count;
    const dirY = node.directionY / node.count;
    const invLength = 1 / Math.max(Math.hypot(dirX, dirY), 0.0001);
    const nextX = node.x + dirX * invLength * stepSize;
    const nextY = node.y + dirY * invLength * stepSize;

    const overlapsExisting = loadingNodes.some(existing =>
      Math.hypot(existing.x - nextX, existing.y - nextY) < stepSize * 0.45
    );

    if (!overlapsExisting) {
      newNodes.push(new LoadingNode(nextX, nextY, node));
    }
  }

  if (newNodes.length === 0) {
    loadingTreeFinished = true;
    return;
  }

  loadingNodes.push(...newNodes);
}

function syncLoadingTreeToProgress(progress, elapsed) {
  const progressTarget = Math.max(0.12, progress);
  const timeTarget = Math.min(0.68, elapsed / 2200);
  const growthTarget = Math.max(progressTarget, timeTarget);
  const targetNodes = Math.max(22, Math.floor(maxLoadingNodes * growthTarget));
  let safety = 0;

  while (!loadingTreeFinished && loadingNodes.length < targetNodes && safety < 14) {
    growLoadingTree();
    safety += 1;
  }
}

function drawTree(progress, elapsed) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const sway = Math.sin(elapsed * 0.0016) * 14;
  const rootX = width * 0.5;
  const rootY = height * 0.82;

  syncLoadingTreeToProgress(progress, elapsed);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(rootX, height * 0.42, 10, rootX, height * 0.42, width * 0.32);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  for (const attractor of loadingAttractors) {
    ctx.fillStyle = attractor.consumed
      ? "rgba(255, 255, 255, 0.03)"
      : "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(attractor.x, attractor.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#fffaf0";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255, 255, 255, 0.24)";
  ctx.shadowBlur = 14;

  for (const node of loadingNodes) {
    if (!node.parent) {
      continue;
    }

    const parentFactor = 1 - (node.parent.y / rootY);
    const nodeFactor = 1 - (node.y / rootY);
    const x1 = node.parent.x + sway * parentFactor;
    const y1 = node.parent.y;
    const x2 = node.x + sway * nodeFactor;
    const y2 = node.y;

    ctx.lineWidth = 1.2 + (1 - nodeFactor) * 3.1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  const ground = ctx.createLinearGradient(0, rootY - 30, 0, height);
  ground.addColorStop(0, "rgba(255, 255, 255, 0)");
  ground.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, rootY - 20, width, height - rootY + 20);

  const progressWidth = Math.min(width * 0.56, 480);
  const progressHeight = 12;
  const progressX = (width - progressWidth) / 2;
  const progressY = height * 0.88;

  drawRoundedRect(progressX, progressY, progressWidth, progressHeight, progressHeight / 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();

  drawRoundedRect(progressX, progressY, progressWidth * progress, progressHeight, progressHeight / 2);
  ctx.fillStyle = "#f5efdd";
  ctx.fill();
}

function renderLoadingFrame(now = performance.now()) {
  drawTree(totalPhotos === 0 ? 0 : loadedPhotos / totalPhotos, now - startTime);

  if (!overlayHidden) {
    animationFrameId = window.requestAnimationFrame(renderLoadingFrame);
  }
}

function updateProgress() {
  const current = Math.min(loadedPhotos, totalPhotos);
  loadingText.innerText = totalPhotos === 0
    ? "Loading photos..."
    : `${current} / ${totalPhotos} photos loaded`;

  if (totalPhotos > 0 && current >= totalPhotos) {
    finishLoading();
  }
}

function startLoadingAnimation() {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
  }

  overlayHidden = false;
  startTime = performance.now();
  loadingScreen.classList.remove("is-hidden");
  renderLoadingFrame(startTime);
}

function finishLoading() {
  if (overlayHidden) {
    return;
  }

  overlayHidden = true;
  loadingScreen.classList.add("is-hidden");
  window.dispatchEvent(new CustomEvent("loading-screen-hidden"));

  window.setTimeout(() => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }, 700);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
startLoadingAnimation();
updateProgress();

export function setPhotoLoadProgressCallback(cb) {
  window.photoLoadProgressCallback = cb;
}

export async function loadPhotoList() {
  try {
    const response = await fetch("/data/photos.json");
    const data = await response.json();

    photosToLoad = data;
    totalPhotos = photosToLoad.length;
    loadedPhotos = 0;
    maxLoadingNodes = Math.max(120, Math.min(420, Math.floor(totalPhotos * 0.7)));
    initializeLoadingTree();
    updateProgress();

    if (totalPhotos === 0) {
      finishLoading();
    }

    return photosToLoad;
  } catch (err) {
    console.error("Failed to fetch photo list:", err);
    totalPhotos = 0;
    loadedPhotos = 0;
    loadingText.innerText = "Could not load the photo archive.";
    finishLoading();
    return [];
  }
}

export function incrementPhotoProgress() {
  loadedPhotos += 1;
  updateProgress();

  if (window.photoLoadProgressCallback) {
    window.photoLoadProgressCallback(loadedPhotos, totalPhotos);
  }
}
