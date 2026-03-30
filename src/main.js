import * as THREE from "three";
import TWEEN from "https://unpkg.com/@tweenjs/tween.js@20.0.0/dist/tween.esm.js";
import { PointerLockControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";
await document.fonts.load('72px "Sid_handwriting"');

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00000a);
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 60);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

// --- Sounds ---
// Flip sound
const flipSound = new Audio('/assets/sounds/flip.mp3');
flipSound.volume = 0.32; // adjust volume (0.0 to 1.0)

const move = { forward:false, backward:false, left:false, right:false, up:false, down:false };
document.addEventListener('keydown', e=>{
  if(e.code==='KeyW') move.forward=true;
  if(e.code==='KeyS') move.backward=true;
  if(e.code==='KeyA') move.left=true;
  if(e.code==='KeyD') move.right=true;
  if(e.code==='Space') move.up=true;
  if(e.code==='ShiftLeft') move.down=true;
});
document.addEventListener('keyup', e=>{
  if(e.code==='KeyW') move.forward=false;
  if(e.code==='KeyS') move.backward=false;
  if(e.code==='KeyA') move.left=false;
  if(e.code==='KeyD') move.right=false;
  if(e.code==='Space') move.up=false;
  if(e.code==='ShiftLeft') move.down=false;
});
function updateControls(delta){
  const speed = 12*delta;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

  if(move.forward) camera.position.addScaledVector(dir, speed);
  if(move.backward) camera.position.addScaledVector(dir, -speed);
  if(move.left) camera.position.addScaledVector(right, -speed);
  if(move.right) camera.position.addScaledVector(right, speed);
  if(move.up) camera.position.y += speed;
  if(move.down) camera.position.y -= speed;
}

// --- UI/HUD Functions ---
function updateDiscoveryUI(){

  document.getElementById("statPhotos").innerText =
    discoveryStats.photosRevealed;

  document.getElementById("statCities").innerText =
    discoveryStats.cities.size;

  document.getElementById("statCountries").innerText =
    discoveryStats.countries.size;

  document.getElementById("statDistance").innerText =
    Math.round(discoveryStats.totalDistance).toLocaleString();
}

function pulseStat(id){

  const el = document.getElementById(id);

  el.classList.add("statPulse");

  setTimeout(()=>{
    el.classList.remove("statPulse");
  },400);

}

// --- Stats Tracker ---
const discoveryStats = {
  photosRevealed: 0,
  cities: new Set(),
  countries: new Set(),
  totalDistance: 0,
  lastLat: null,
  lastLon: null
};

// --- Attractors ---
const attractors = [];

// --- Nodes / Branches ---
class Node {
  constructor(position, parent=null){
    this.position = position.clone();
    this.parent = parent;
    this.direction = new THREE.Vector3();
    this.count = 0;
  }
}
const nodes = [];
const root = new Node(new THREE.Vector3(0,0,0));
nodes.push(root);
const MAX_TREE_NODES = 7500;

const influenceDistance = 50;
const killDistance = 1.5;
const stepSize = 0.9;
const rangeScale = 1.05;

// Photo Fading/Development
const MAX_VISIBLE_PHOTOS = 42;

// --- Flip on 'E' press ---
document.addEventListener('keydown', e=>{
  if(e.code!=='KeyE') return;

  const maxDist = 5;
  let closest=null;
  let closestDist=Infinity;
  const camPos = camera.position.clone();
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  polaroids.forEach(p=>{
      const pos = p.group.position.clone();
      const dist = camPos.distanceTo(pos);
      if(dist<maxDist){
          const dirTo = pos.clone().sub(camPos).normalize();
          const angle = camDir.angleTo(dirTo);
          if(angle<Math.PI/4 && dist<closestDist){
              closest=p;
              closestDist=dist;
          }
      }
  });

if(closest){

    // toggle state
    closest.flipped = !closest.flipped;

    // update stats
    if (closest.flipped && !closest.discovered) {
      closest.discovered = true;
      const d = closest.data;
    
      // photos revealed
      discoveryStats.photosRevealed++;
      pulseStat("statPhotos");
    
      // cities
      const city =
        d.city ||
        d.town ||
        d.village ||
        d.hamlet ||
        d.state;
    
      if (city) {
        const prevCityCount = discoveryStats.cities.size;
        discoveryStats.cities.add(city)
        if (discoveryStats.cities.size > prevCityCount) {
          pulseStat("statCities");
        }
      };
    
      // countries
      if (d.countryCode) {
        const prevCountryCount = discoveryStats.countries.size;
        discoveryStats.countries.add(d.countryCode);
        if (discoveryStats.countries.size > prevCountryCount) {
          pulseStat("statCountries");
        }
      }
    
      // distance calculation
      if (
        discoveryStats.lastLat !== null &&
        d.lat !== null &&
        d.lon !== null
      ) {
        const dist = haversine(
          discoveryStats.lastLat,
          discoveryStats.lastLon,
          d.lat,
          d.lon
        );
    
        discoveryStats.totalDistance += dist;
        pulseStat("statDistance");
      }
    
      discoveryStats.lastLat = d.lat;
      discoveryStats.lastLon = d.lon;
    
      updateDiscoveryUI();
    }

    // play sound
    flipSound.currentTime = 0;
    flipSound.play();

    const flipDirection = Math.random();

    // animate rotation
    new TWEEN.Tween(closest.pivot.rotation)
    .to({
      y: closest.flipped ? (Math.random() > 0.5 ? Math.PI : -Math.PI) : 0,
      z: closest.flipped ? (Math.random()-0.5)*0.25 : 0
    }, 450)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
}
});

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }

  lines.push(line.trim());

  lines.forEach((l, i) => {
    ctx.strokeText(l, x, y + i * lineHeight);
    ctx.fillText(l, x, y + i * lineHeight);
  });

  return lines.length * lineHeight;
}

function createPolaroidBackTexture(photoData, aspect) {
  const BASE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = BASE * aspect;
  canvas.height = BASE;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text style
  const r = 15 + Math.random()*15;
  const g = 15 + Math.random()*15;
  const b = 20 + Math.random()*20;

  const scale = canvas.height / 512;
  const textColor = `rgba(${r}, ${g}, ${b})`;

  ctx.globalAlpha = 0.95 + Math.random() * 0.05;
  ctx.fillStyle = textColor;
  ctx.strokeStyle = textColor;
  
  ctx.lineWidth = 4 * scale;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `${72 * scale}px "Sid_handwriting"`;


  // Date formatting
  const dateObj = new Date(photoData.date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const dateStr = `${day} . ${month} . ${year}`;

  // Time formatting
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2,'0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const timeStr = `${hours}:${minutes}${ampm}`;

  // Lat / Lon formatting
  const lat = photoData.lat != null ? photoData.lat.toFixed(4) : '';
  const lon = photoData.lon != null ? photoData.lon.toFixed(4) : '';

  // Flag
  const flag = flagEmojiFromCode(photoData.countryCode);

  // const locationStr = `${photoData.city || 'Unknown'}, ${lat}, ${lon}`;
  let locationName =
  photoData.city ||
  photoData.town ||
  photoData.village ||
  photoData.hamlet ||
  photoData.state ||
  "Unknown";

  // Only truncate for vertical photos
  if (aspect < 1 && locationName.length > 9) {
    locationName = locationName.slice(0, 9) + "...";
  }

  const locationStr = `${locationName} ${flag}`;

  const lines = [
    locationStr,
    dateStr,
    timeStr
  ];

  // Draw text
  let y = 40 * scale;
  const x = 40 * scale;
  const maxWidth = canvas.width - 80 * scale;
  const lineHeight = 80 * scale;

  lines.forEach(line => {
    const usedHeight = drawWrappedText(
      ctx,
      line,
      x,
      y,
      maxWidth,
      lineHeight
    );

    y += usedHeight + 20 * scale;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4
  texture.needsUpdate = true;
  texture.flipY = true;
  return texture;
}

// --- Branch Material ---
const branchMaterial = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.7,
});

// --- Persistent Branch Geometry ---
const MAX_BRANCHES = 20000;

const branchPositions = new Float32Array(MAX_BRANCHES * 6);

const branchGeometry = new THREE.BufferGeometry();
branchGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(branchPositions, 3)
);

const branchLines = new THREE.LineSegments(branchGeometry, branchMaterial);
scene.add(branchLines);

let branchIndex = 0;

let treeFinished = false;

function growBranches() {
    if (nodes.length > MAX_TREE_NODES) {
      treeFinished = true;
      console.warn("Tree stopped: node cap reached");
      return;
    }
    if (attractors.length === 0) {
      treeFinished = true;
      console.log("Tree finished (all attractors consumed)");
      return;
    }
    if (treeFinished){
      console.log("Tree finished");
      return
    } ; // stop if already finished

    let newNodesCount = 0;

    // reset node directions
    nodes.forEach(n => {
        n.direction.set(0,0,0);
        n.count = 0;
    });

    // attract nodes toward attractors
    for (let i = attractors.length - 1; i >= 0; i--) {
        const attractor = attractors[i];
        let closestNode = null;
        let closestDist = Infinity;

        nodes.forEach(node => {
            const dist = node.position.distanceTo(attractor);
            if (dist < killDistance) {
                attractors.splice(i,1);
                closestNode = null;
                return;
            }
            if (dist < influenceDistance && dist < closestDist) {
                closestNode = node;
                closestDist = dist;
            }
        });

        if (closestNode) {
            const dir = new THREE.Vector3().subVectors(attractor, closestNode.position).normalize();
            closestNode.direction.add(dir);
            closestNode.count++;
        }
    }

    // grow new nodes
    const newNodes = [];

    nodes.forEach(node => {
        if (node.count > 0) {
            const avgDir = node.direction.divideScalar(node.count).normalize();
            const newPos = node.position.clone().add(avgDir.multiplyScalar(stepSize));
            const newNode = new Node(newPos, node);
            newNodes.push(newNode);
        }
    });

    nodes.push(...newNodes);
    newNodesCount = newNodes.length;

    if (newNodesCount === 0) {
        treeFinished = true; // stop further growth
        console.log("Tree growth finished!");
    }
}

function updateBranchGeometry(){

  branchIndex = 0;

  nodes.forEach(node => {

    if(!node.parent) return;

    const p1 = node.position;
    const p2 = node.parent.position;

    const i = branchIndex * 6;

    branchPositions[i]   = p1.x;
    branchPositions[i+1] = p1.y;
    branchPositions[i+2] = p1.z;

    branchPositions[i+3] = p2.x;
    branchPositions[i+4] = p2.y;
    branchPositions[i+5] = p2.z;

    branchIndex++;

  });

  branchGeometry.setDrawRange(0, Math.max(branchIndex * 2, 2));
  branchGeometry.attributes.position.needsUpdate = true;
}

function pulseBranches(){
  const t=Date.now()*0.002;
  branchMaterial.color.setHSL(0.5,1,0.5+0.5*Math.sin(t));
  branchMaterial.opacity=0.5+0.5*Math.sin(t);
}

function flagEmojiFromCode(code) {
  if (!code) return "";
  return code
    .toUpperCase()
    .split("")
    .map(c => String.fromCodePoint(127397 + c.charCodeAt()))
    .join("");
}

function haversine(lat1, lon1, lat2, lon2) {

  const R = 6371; // km
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// --- Polaroids ---
const textureLoader = new THREE.TextureLoader();
const polaroids = [];


// --- Load Polaroids ---
fetch("/data/photos.json")
  .then(res=>res.json())
  .then(data=>{
    data.forEach((photo,i)=>{
      document.getElementById("statTotalPhotos").innerText = data.length;
      attractors.push(
        new THREE.Vector3(
          (Math.random()-0.5)*80*rangeScale,
          (Math.random()-0.5)*40*rangeScale,
          (Math.random()-0.5)*80*rangeScale
        )
      );

      treeFinished = false;
      nodes.length = 0;
      nodes.push(new Node(new THREE.Vector3(0,0,0)));

      textureLoader.load(`/assets/photos/${photo.filename}`, tex=>{
        const aspect = photo.width/photo.height;
        const group = new THREE.Group();      // billboard rotation
        const flipPivot = new THREE.Group();  // flip animation
        group.add(flipPivot);

        const frameHeight = 3.6;
        const frameWidth = frameHeight*aspect;
        const bottomBorder = 0.5;

        // Frame
        const frameGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
        const frameMat = new THREE.MeshBasicMaterial({color:0xffffff});
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.position.y = -bottomBorder/2;
        flipPivot.add(frameMesh);

        // Photo front
        const photoHeight = frameHeight-bottomBorder-0.2;
        const photoWidth = photoHeight*aspect;
        const photoMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(photoWidth, photoHeight),
          new THREE.MeshBasicMaterial({map:tex, transparent:true, opacity:0})
        );
        photoMesh.position.set(0, (bottomBorder+0.2)/2 - 0.5, 0.01);
        photoMesh.material.opacity = 0;
        flipPivot.add(photoMesh);

        // Photo back
        const backTex = createPolaroidBackTexture(data[i], aspect);
        const backMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(photoWidth, photoHeight),
          new THREE.MeshBasicMaterial({map: backTex, transparent:false})
        );
        backMesh.position.copy(photoMesh.position);
        backMesh.visible = true;
        backMesh.rotation.y = Math.PI;
        flipPivot.add(backMesh);

        // Position
        const attractor = attractors[i] || new THREE.Vector3(
          (Math.random()-0.5)*80*rangeScale,
          (Math.random()-0.5)*40*rangeScale,
          (Math.random()-0.5)*80*rangeScale
        );
        // if (attractor) {
        //   group.position.copy(attractor);
        // } else {
        //   console.warn("Attractor undefined for photo", i);
        //   group.position.set(0,0,0); // fallback
        // }
        group.position.copy(attractor);

        // Random tilt
        flipPivot.rotation.z = (Math.random()-0.5)*0.2;

        polaroids.push({
          group,
          pivot: flipPivot,
          front: photoMesh,
          back: backMesh,
          flipped: false,
          opacity: 0,
          targetOpacity: 0,
          distance: Infinity,
          data: photo,
          discovered: false,
        });

        scene.add(group);
      });
    });
  });

// Reusable vectors
const tempWorld = new THREE.Vector3();
const tempLook = new THREE.Vector3();
const tempCam = new THREE.Vector3();
  
// --- Animate ---
function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateControls(delta);

  if (Math.random() < 0.01) {
    console.log("nodes:", nodes.length);
  }
  if (!treeFinished) {
    growBranches();
    updateBranchGeometry();
  }
  pulseBranches();

  const now = performance.now();
  tempCam.copy(camera.position);

  // compute distances
  const sorted = polaroids
    .map(p => {
      p.group.getWorldPosition(tempWorld);
      return { p, dist: tempWorld.distanceToSquared(tempCam) };
    })
    .sort((a,b)=>a.dist-b.dist);

  // mark nearest photos
  sorted.forEach((entry, i)=>{
    entry.p.targetOpacity = i < MAX_VISIBLE_PHOTOS ? 1 : 0;
  });

  // update fade + billboard
  polaroids.forEach(p=>{

    p.group.getWorldPosition(tempWorld);

    tempLook.copy(camera.position);
    tempLook.y = tempWorld.y;
    p.group.lookAt(tempLook);

    // smooth fade
    const speed = delta * 2;
    p.opacity += (p.targetOpacity - p.opacity) * speed;

    p.front.material.opacity = p.opacity;
    const visible = p.opacity > 0.01;

    p.front.visible = visible;
    p.back.visible = visible;
  });

  TWEEN.update();
  renderer.render(scene, camera);
}

animate();

// --- Resize ---
window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});