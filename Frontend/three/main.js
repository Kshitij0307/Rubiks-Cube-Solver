import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import { OrbitControls } from './controls/OrbitControls.js';  // Adjust path as needed

const BACKEND_URL = "https://rubiks-cube-solver-eyq4.onrender.com";

// The backend is hosted on Render's free tier, which spins the service down
// after a period of inactivity and takes up to ~a minute to spin back up on
// the next request. Ping a lightweight health endpoint as soon as the page
// loads so a sleeping instance starts waking up before the user ever hits
// Solve/Scan.
let serverReady = false;

function pingHealthCheck() {
  return fetch(`${BACKEND_URL}/api/health/`)
    .then((res) => {
      serverReady = res.ok;
      return res.ok;
    })
    .catch(() => {
      serverReady = false;
      return false;
    });
}

// Fired immediately, at module load (i.e. as soon as the page loads) — NOT
// deferred until ensureServerAwake() is called. `ensureServerAwake()` below
// just awaits this same in-flight/already-resolved promise, so by the time
// the user clicks Solve/Scan the ping has usually already completed and
// `serverReady` is already true.
const serverWarmup = pingHealthCheck();

async function ensureServerAwake() {
  if (serverReady) return;

  let popup = null;
  const slowTimer = setTimeout(() => {
    popup = showInfoPopup(
      "Waking up the solver server — this can take up to a minute on first use..."
    );
  }, 1500);

  await serverWarmup;

  clearTimeout(slowTimer);
  if (popup) removePopup(popup);
}

let moveHistory = [];
let moveCount = 0;
let rotationArrow = null;
let isRotating = false;
let isExecutingMoves = false;
let isTypingMoves = false;
let isPaused = false;
let currentMoveIndex = 0;
let currentMoveSequence = [];

const cubeColors = {
  white: 0xffffff, // Pure white
  green: 0x1c9e37, // Brighter green
  red: 0xd52027, // Standard red
  blue: 0x0051ba, // Classic bright blue
  orange: 0xff6f00, // Standard bright orange
  yellow: 0xffd700, // Bright yellow, closer to gold
};

const colorMap = {
  [cubeColors.white]: "W", // Up
  [cubeColors.green]: "G", // Front
  [cubeColors.red]: "R", // Right
  [cubeColors.blue]: "B", // Back
  [cubeColors.orange]: "O", // Left
  [cubeColors.yellow]: "Y", // Down
  0x282828: "X", // Hidden face (note: direct hex value, not string)
};

function checkSolved() {
  const state = getCurrentCubeState();

  // Check if each face has all the same color
  return state.every((face) => {
    const centerColor = face[4]; // Center sticker
    return face.every((sticker) => sticker === centerColor);
  });
}

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Black background

// Enhanced starfield
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 5000; // Increased number of stars
const positions = new Float32Array(starsCount * 3);
const colors = new Float32Array(starsCount * 3);
const sizes = new Float32Array(starsCount);

for (let i = 0; i < starsCount * 3; i += 3) {
  // Randomize positions in a sphere rather than a cube
  const radius = Math.random() * 1000 + 500; // Between 500 and 1500
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);

  positions[i] = radius * Math.sin(phi) * Math.cos(theta);
  positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
  positions[i + 2] = radius * Math.cos(phi);

  // Add slight color variations
  colors[i] = 0.8 + Math.random() * 0.2; // R
  colors[i + 1] = 0.8 + Math.random() * 0.2; // G
  colors[i + 2] = 0.8 + Math.random() * 0.2; // B

  // Randomize star sizes
  sizes[i / 3] = Math.random() * 2 + 0.5;
}

starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
starsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
starsGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

// Create custom shader material for stars
const starsMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    pixelRatio: { value: window.devicePixelRatio },
  },
  vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float pixelRatio;
        
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float distance = length(position) * 0.02;
            float twinkle = sin(time * 0.5 + distance) * 0.5 + 0.5;
            gl_PointSize = size * pixelRatio * twinkle;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
  fragmentShader: `
        varying vec3 vColor;
        
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha);
        }
    `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Add antialiasing
renderer.setPixelRatio(window.devicePixelRatio); // Handle high DPI displays
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Add lighting to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 3.0); // Increased from 0.7 to 1.0
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Increased from 0.5 to 0.8
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Add an additional light source from the opposite direction for better illumination
const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.3); // New light source
secondaryLight.position.set(-10, -10, -10);
scene.add(secondaryLight);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);
controls.target.set(0, 0, 0);

// Add smooth controls configuration
controls.enableDamping = false; // Add smooth damping
controls.dampingFactor = 0.05; // Lower values = more smoothing (default is 0.05)
controls.rotateSpeed = 0.5; // Slower rotation (default is 1.0)
controls.zoomSpeed = 0.5; // Slower zoom (default is 1.0)
controls.panSpeed = 0.5; // Slower panning (default is 1.0)

controls.update();

let ROTATION_DURATION = 500; // milliseconds

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Single source of truth for the face name <-> notation letter correspondence
// (e.g. "front" <-> "F"), shared by the move indicator, the manual move
// buttons, and every place that turns typed/solver notation back into a face.
const FACE_LETTERS = [
  ["right", "R"],
  ["left", "L"],
  ["up", "U"],
  ["down", "D"],
  ["front", "F"],
  ["back", "B"],
];
const faceToLetter = Object.fromEntries(FACE_LETTERS);
const letterToFace = Object.fromEntries(
  FACE_LETTERS.map(([face, letter]) => [letter.toLowerCase(), face])
);

// Live move indicator (e.g. "F", "F'") shown above the cube while a face turns
const moveIndicator = document.createElement("div");
moveIndicator.id = "moveIndicator";
document.body.appendChild(moveIndicator);

function showMoveIndicator(face, clockwise, label) {
  moveIndicator.textContent = label || faceToLetter[face] + (clockwise ? "" : "'");
  moveIndicator.classList.add("visible");
}

function hideMoveIndicator() {
  moveIndicator.classList.remove("visible");
}

function getFaceCubies(face, layer) {
  return cubeGroup.children.filter((cubie) => {
    switch (face) {
      case "right":
        return Math.abs(cubie.position.x - layer) < 0.1;
      case "left":
        return Math.abs(cubie.position.x - layer) < 0.1;
      case "up":
        return Math.abs(cubie.position.y - layer) < 0.1;
      case "down":
        return Math.abs(cubie.position.y - layer) < 0.1;
      case "front":
        return Math.abs(cubie.position.z - layer) < 0.1;
      case "back":
        return Math.abs(cubie.position.z - layer) < 0.1;
    }
  });
}

// Add this new function
function createArrowForFace(face, clockwise) {
  const texturePath = clockwise ? "images/arrow.jpg" : "images/arrowRev.jpg";

  const arrowTexture = new THREE.TextureLoader().load(texturePath);
  const spriteMaterial = new THREE.SpriteMaterial({
    map: arrowTexture,
    transparent: true,
    opacity: 0.9,
  });

  const arrow = new THREE.Sprite(spriteMaterial);
  arrow.scale.set(0.8, 0.8, 0.8); // Slightly smaller scale for better visibility

  // Increased offset to prevent clipping
  const offset = 2.5; // Increased from 1.6 to 2.5
  // Position the arrow based on face with adjusted distances
  switch (face) {
    case "front":
      arrow.position.z = offset;
      break;
    case "back":
      arrow.position.z = -offset;
      break;
    case "right":
      arrow.position.x = offset;
      arrow.rotation.y = Math.PI / 2;
      break;
    case "left":
      arrow.position.x = -offset;
      arrow.rotation.y = -Math.PI / 2;
      break;
    case "up":
      arrow.position.y = offset;
      arrow.rotation.x = -Math.PI / 2;
      break;
    case "down":
      arrow.position.y = -offset;
      arrow.rotation.x = Math.PI / 2;
      break;
  }

  // Add a small random offset to prevent z-fighting with other arrows
  const randomOffset = 0.01;
  arrow.position.x += (Math.random() - 0.5) * randomOffset;
  arrow.position.y += (Math.random() - 0.5) * randomOffset;
  arrow.position.z += (Math.random() - 0.5) * randomOffset;

  return arrow;
}

// Modify rotateFace to accept skipArrow parameter
// `label` optionally overrides the displayed notation (e.g. "U2" for a double
// move, which is executed as two separate rotateFace calls under the hood).
function rotateFace(face, clockwise = true, skipArrow = false, label = null) {
  return new Promise((resolve) => {
    if (isRotating || isTypingMoves) {
      return;
    }
    isRotating = true;

    // Remove existing arrow
    if (rotationArrow) {
      scene.remove(rotationArrow);
      rotationArrow = null;
    }

    // Only show the arrow + move-notation text when not skipping (scramble
    // passes skipArrow=true for every move, so neither shows up then)
    if (!skipArrow) {
      rotationArrow = createArrowForFace(face, clockwise);
      scene.add(rotationArrow);
      showMoveIndicator(face, clockwise, label);
    }

    const layer =
      face === "right" || face === "up" || face === "front" ? 1 : -1;
    const cubies = getFaceCubies(face, layer);

    let axis = new THREE.Vector3();
    switch (face) {
      case "right":
      case "left":
        axis.set(1, 0, 0);
        break;
      case "up":
      case "down":
        axis.set(0, 1, 0);
        break;
      case "front":
      case "back":
        axis.set(0, 0, 1);
        break;
    }

    let rotationMultiplier = clockwise ? -1 : 1;
    if (face === "left" || face === "back" || face === "down") {
      rotationMultiplier *= -1;
    }

    const totalAngle = degToRad(90 * rotationMultiplier);
    const startTime = Date.now();

    const pivot = new THREE.Object3D();
    scene.add(pivot);

    const originalParents = cubies.map((cubie) => cubie.parent);

    cubies.forEach((cubie) => {
      const worldPos = new THREE.Vector3();
      cubie.getWorldPosition(worldPos);
      pivot.attach(cubie);
      cubie.position.copy(worldPos);
    });

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ROTATION_DURATION, 1);

      if (rotationArrow) {
        rotationArrow.rotation.copy(pivot.rotation);
      }

      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentAngle = totalAngle * eased;
      pivot.setRotationFromAxisAngle(axis, currentAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        cubies.forEach((cubie, index) => {
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          cubie.getWorldPosition(worldPos);
          cubie.getWorldQuaternion(worldQuat);

          originalParents[index].attach(cubie);
          cubie.position.copy(worldPos);
          cubie.quaternion.copy(worldQuat);
        });

        scene.remove(pivot);
        isRotating = false;
        hideMoveIndicator();

        if (rotationArrow) {
          scene.remove(rotationArrow);
          rotationArrow = null;
        }

        // Track move
        moveCount++;
        moveHistory.push({ face, clockwise });
        checkSolved();

        resolve(); // Resolve the promise when animation is complete
      }
    }

    animate();
  });
}

// Add keyboard controls
window.addEventListener("keydown", (event) => {
  // Skip ALL keyboard moves if typing in input or executing moves
  if (isTypingMoves || isExecutingMoves) return;

  if (event.key === "z" && event.ctrlKey) {
    undoMove();
    return;
  }

  // Only process keyboard moves when not typing
  switch (event.key.toLowerCase()) {
    case "r":
      rotateFace("right", !event.shiftKey);
      break;
    case "l":
      rotateFace("left", !event.shiftKey);
      break;
    case "u":
      rotateFace("up", !event.shiftKey);
      break;
    case "d":
      rotateFace("down", !event.shiftKey);
      break;
    case "f":
      rotateFace("front", !event.shiftKey);
      break;
    case "b":
      rotateFace("back", !event.shiftKey);
      break;
  }
});

// Create the Rubik's cube
const cubeGroup = new THREE.Group();

// Face-notation labels (U/F/R/B/L/D), one fixed marker per face.
// Drawn as a small, low-opacity, darkened-tint texture so it stays subtle.
// Attached to cubeGroup directly (NOT to any cubie) and positioned just
// outside the whole cube, so they never spin during face-turn animations
// and stay readable at all times.
const faceLabelConfigs = [
  { letter: "R", color: cubeColors.red, position: [1.476, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { letter: "L", color: cubeColors.orange, position: [-1.476, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { letter: "U", color: cubeColors.white, position: [0, 1.476, 0], rotation: [-Math.PI / 2, 0, 0] },
  { letter: "D", color: cubeColors.yellow, position: [0, -1.476, 0], rotation: [Math.PI / 2, 0, 0] },
  { letter: "F", color: cubeColors.green, position: [0, 0, 1.476], rotation: [0, 0, 0] },
  { letter: "B", color: cubeColors.blue, position: [0, 0, -1.476], rotation: [0, Math.PI, 0] },
];

function createFaceLabel(letter, baseColorHex) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Darken + tint the sticker's own color for a subtle, low-contrast mark
  const labelColor = new THREE.Color(baseColorHex).multiplyScalar(0.35);
  ctx.fillStyle = `rgba(${Math.round(labelColor.r * 255)}, ${Math.round(
    labelColor.g * 255
  )}, ${Math.round(labelColor.b * 255)}, 0.55)`;
  ctx.font = "bold 150px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, size / 2, size / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(0.35, 0.35);
  const label = new THREE.Mesh(geometry, material);
  label.renderOrder = 1;
  return label;
}

// Function to create a single cubie
function createCubie(x, y, z) {
  const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  const materials = [];

  // Order: right, left, top, bottom, front, back
  const colorOrder = [
    x === 1 ? cubeColors.red : 0x282828,
    x === -1 ? cubeColors.orange : 0x282828,
    y === 1 ? cubeColors.white : 0x282828,
    y === -1 ? cubeColors.yellow : 0x282828,
    z === 1 ? cubeColors.green : 0x282828,
    z === -1 ? cubeColors.blue : 0x282828,
  ];

  colorOrder.forEach((color) => {
    materials.push(
      new THREE.MeshPhongMaterial({
        color: color,
        shininess: 15,
        specular: 0x222222,
        flatShading: false,
      })
    );
  });

  const cubie = new THREE.Mesh(geometry, materials);
  cubie.castShadow = true;
  cubie.receiveShadow = true;
  cubie.position.set(x, y, z);

  return cubie;
}

// Create all 27 cubies
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      const cubie = createCubie(x, y, z);
      cubeGroup.add(cubie);
    }
  }
}

// Add the 6 fixed face-notation labels to their own group, added directly to
// the scene (NOT to cubeGroup/any cubie). Two reasons this matters:
//  1. Face turns never rotate them - they stay upright and readable.
//  2. cubeGroup.children is walked elsewhere (getCurrentCubeState, resetCube)
//     assuming every child is a cubie with a 6-material array; a label mesh
//     only has one plain material, so mixing them into cubeGroup breaks
//     those `.material.forEach(...)` calls.
const faceLabelGroup = new THREE.Group();
faceLabelConfigs.forEach((config) => {
  const label = createFaceLabel(config.letter, config.color);
  label.position.set(...config.position);
  label.rotation.set(...config.rotation);
  faceLabelGroup.add(label);
});
scene.add(faceLabelGroup);

scene.add(cubeGroup);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update star field
  starsMaterial.uniforms.time.value = performance.now() * 0.001;
  starField.rotation.y += 0.0001;

  controls.update(); // This is important for smooth damping to work
  renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener("resize", () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(newWidth, newHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
});


const manualMoveButtons = [];

// Assigned inside createActionButtons() (it closes over the grid buttons
// created there), but declared here at module scope so createMoveInput()'s
// moveButton handler - a separate top-level function - can call it too.
let setActionControlsDisabled;

function createMoveButtons() {
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("button-container");

  // Display order: all 6 clockwise buttons, then all 6 counter-clockwise
  const buttonFaceOrder = ["up", "front", "right", "back", "left", "down"];
  const moves = [true, false].flatMap((clockwise) =>
    buttonFaceOrder.map((face) => ({
      face,
      clockwise,
      label: faceToLetter[face] + (clockwise ? "" : "'"),
    }))
  );

  moves.forEach(({ label, face, clockwise }) => {
    const button = document.createElement("button");
    button.textContent = label;

    button.addEventListener("click", () => rotateFace(face, clockwise));
    buttonContainer.appendChild(button);
    manualMoveButtons.push(button);
  });

  document.body.appendChild(buttonContainer);
}
createMoveButtons();

function isValidMoveSequence(currentMoveSequence) {
  const validMoves = ["u", "d", "l", "r", "f", "b"]; // Base moves
  const validSuffixes = ["", "'", "2"]; // Optional suffixes for moves
  
  // Validate each move in the sequence
  for (const move of currentMoveSequence) {
    // Check if the move starts with a valid base move
    const baseMove = move[0]; // First character
    const suffix = move.slice(1); // Remaining part of the move
    
    if (!validMoves.includes(baseMove) || !validSuffixes.includes(suffix)) {
      return false; // If invalid, return false immediately
    }
  }
  
  return true; // All moves are valid
}

// Update the createMoveInput function
function createMoveInput() {
  // Create input container
  const inputContainer = document.createElement("div");
  inputContainer.id = "inputContainer";

  // Create input element
  const input = document.createElement("textarea");
  input.placeholder = "Enter moves (e.g., U L R R' U2)";
  input.rows = 2;

  // Add input to container
  inputContainer.appendChild(input);

  // Create button container
  const buttonContainer = document.createElement("div");
  buttonContainer.id = "buttonContainer";

  // Create move button
  const moveButton = document.createElement("button");
  moveButton.id = "moveButton";
  moveButton.textContent = "Execute Moves";

  // Create control buttons container
  const controlsContainer = document.createElement("div");
  controlsContainer.id = "moveControls";

  // Add move button click handler
  moveButton.addEventListener("click", async () => {
    const sequence = input.value.trim();
    if (!sequence || isExecutingMoves) return;

    isExecutingMoves = true;
    setActionControlsDisabled(true);
    currentMoveSequence = sequence.split(/\s+/).map(move => move.toLowerCase())

    const isValid = isValidMoveSequence(currentMoveSequence);
    if(!isValid) {
      showErrorPopup("Invalid move sequence");
      isExecutingMoves = false;
      setActionControlsDisabled(false);
      return;
    }

    currentMoveIndex = 0;
    isPaused = false;

    controlsContainer.style.display = "flex";
    moveButton.style.display = "none";

    // Find the play/pause button and set it to pause initially
    const playPauseButton = controlsContainer.querySelector(
      'button[title="Play"], button[title="Pause"]'
    );
    if (playPauseButton) {
      const image = playPauseButton.querySelector("img");
      if (image) {
        image.src = "images/pause.jpg";
        playPauseButton.title = "Pause";
      }
    }

    try {
      // Note: this can resolve because playback merely paused, not just
      // because it finished - continueMoveSequence() itself only re-enables
      // the other action controls once the sequence is genuinely done (see
      // finalizePlaybackControls), so nothing further is needed here on the
      // success path. Only an actual error should force controls back on.
      await continueMoveSequence();
    } catch (error) {
      console.error("Error executing moves:", error);
      finalizePlaybackControls();
    }
  });

  // Assemble the components
  buttonContainer.appendChild(moveButton);
  buttonContainer.appendChild(controlsContainer);
  inputContainer.appendChild(buttonContainer);
  document.body.appendChild(inputContainer);

  // Create the control buttons by passing the container
  createControlButtons();

  // Add focus/blur handlers to track typing state
  input.addEventListener("focus", () => {
    isTypingMoves = true;
  });

  input.addEventListener("blur", () => {
    isTypingMoves = false;
  });
}
// Call this after all other initialization code
createMoveInput();

// Add this function to create control buttons
function createControlButtons() {
  // Get the existing controls container
  const controlsContainer = document.getElementById("moveControls");

  // Make sure container exists
  if (!controlsContainer) {
    console.error("Control container is not defined");
    return;
  }

  // Clear existing controls if any
  controlsContainer.innerHTML = "";

  const controls = [
    { img: "images/prev.jpg", action: "prev", title: "Previous Move" },
    { img: "images/pause.jpg", action: "playpause", title: "Pause" },
    { img: "images/next.jpg", action: "next", title: "Next Move" },
    { img: "images/stop.jpg", action: "stop", title: "Stop" },
  ];

  controls.forEach(({ img, action, title }) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    image.src = img;
    image.alt = title;
    image.style.cssText = `
      width: clamp(24px, 3vw, 32px);
      height: clamp(24px, 3vw, 32px);
      display: block;
      margin: auto;
      border-radius: 50%;
      object-fit: cover;
    `;

    button.appendChild(image);
    button.title = title;
    button.style.cssText = `
      padding: clamp(4px, 0.8vw, 6px);
      width: clamp(35px, 4.5vw, 40px);
      height: clamp(35px, 4.5vw, 40px);
      font-family: 'Arial', sans-serif;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(30, 35, 60, 0.9), rgba(20, 25, 45, 0.9));
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      max-width: clamp(35px, 4.5vw, 40px);
      margin: 0 clamp(2px, 0.3vw, 3px);
    `;

    if (action === "playpause") {
      const playImage = "images/play.jpg";
      const pauseImage = "images/pause.jpg";
      button.addEventListener("click", () => {
        handleControlAction(action);
        if (isPaused) {
          image.src = playImage;
          button.title = "Play";
        } else {
          image.src = pauseImage;
          button.title = "Pause";
        }
      });
    } else if (action === "stop") {
      button.addEventListener("click", () => {
        handleControlAction(action);
        const moveButton = document.getElementById("moveButton");
        if (moveButton) {
          moveButton.style.display = "block";
          controlsContainer.style.display = "none";
        }
      });
    } else {
      button.addEventListener("click", () => handleControlAction(action));
    }

    controlsContainer.appendChild(button);
  });
}


// Keep the play/pause button's icon/title in sync with isPaused when it
// changes from somewhere other than that button's own click handler
// (e.g. "prev"/"next" auto-pausing the sequence).
function syncPlayPauseIcon() {
  const playPauseButton = document.querySelector(
    '#moveControls button[title="Play"], #moveControls button[title="Pause"]'
  );
  if (!playPauseButton) return;
  const image = playPauseButton.querySelector("img");
  if (image) image.src = isPaused ? "images/play.jpg" : "images/pause.jpg";
  playPauseButton.title = isPaused ? "Play" : "Pause";
}

// Add this function to handle control actions
async function handleControlAction(action) {
  switch (action) {
    case "prev":
      // Stepping manually must stop the auto-play loop (continueMoveSequence)
      // first - otherwise a rapid click can race that loop's own in-flight
      // rotateFace call, which never resolves if it collides (see
      // rotateFace's isRotating guard), permanently hanging the sequence and
      // leaving the disabled controls stuck. Pausing here (instead of just
      // requiring isPaused already) keeps "spam next/prev to fast-forward"
      // working even if playback wasn't paused first.
      isPaused = true;
      syncPlayPauseIcon();
      if (currentMoveIndex > 0 && !isRotating) {
        currentMoveIndex--;
        const lastMove = currentMoveSequence[currentMoveIndex];
        const face = lastMove.charAt(0).toLowerCase();
        const isDouble = lastMove.includes("2");
        const isCounterClockwise = lastMove.includes("'");

        const faceToRotate = letterToFace[face];
        if (!faceToRotate) {
          console.error("Invalid move:", face);
          return;
        }

        if (isDouble) {
          // For double moves (U2), perform the same move again
          const label = faceToLetter[faceToRotate] + "2";
          await rotateFace(faceToRotate, !isCounterClockwise, false, label);
          await rotateFace(faceToRotate, !isCounterClockwise, false, label);
        } else {
          // For single moves (U or U'), perform the inverse
          await rotateFace(faceToRotate, isCounterClockwise);
        }
      }
      break;
    case "next":
      // Same reasoning as "prev" above.
      isPaused = true;
      syncPlayPauseIcon();
      if (currentMoveIndex < currentMoveSequence.length && !isRotating) {
        await executeMoveAtIndex(currentMoveIndex);
        currentMoveIndex++;
      }
      break;
    case "playpause":
      isPaused = !isPaused;
      if (!isPaused && currentMoveIndex < currentMoveSequence.length) {
        continueMoveSequence();
      }
      break;
    case "stop":
      isPaused = true;
      currentMoveIndex = 0;
      currentMoveSequence = [];
      finalizePlaybackControls();

      const moveInput = document.querySelector("textarea");
      if (moveInput) {
        moveInput.value = "";
      }

      // Remove the moves count container if it exists
      const existingMovesContainer = document.querySelector(
        "#movesCountContainer"
      );
      if (existingMovesContainer) {
        existingMovesContainer.remove();
      }

      const moveButton = document.getElementById("moveButton");
      const moveControls = document.getElementById("moveControls");
      if (moveButton && moveControls) {
        moveButton.style.display = "block";
        moveButton.textContent = "Execute Moves";
        moveControls.style.display = "none";
      }
      break;
  }
}
// Add this function to execute a specific move
async function executeMoveAtIndex(index) {
  const move = currentMoveSequence[index];
  if (!move) return;

  const face = move.charAt(0).toLowerCase();
  const isDouble = move.includes("2");
  const isCounterClockwise = move.includes("'");

  const executeSingleMove = async () => {
    await rotateFace(
      letterToFace[face],
      !isCounterClockwise,
      false,
      isDouble ? face.toUpperCase() + "2" : null
    );
  };

  if (isDouble) {
    await executeSingleMove();
    await executeSingleMove();
  } else {
    await executeSingleMove();
  }
}

// Add this function to continue the sequence
async function continueMoveSequence() {
  while (currentMoveIndex < currentMoveSequence.length && !isPaused) {
    await executeMoveAtIndex(currentMoveIndex);
    currentMoveIndex++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // The while loop above also exits when playback is merely paused, not
  // just when the sequence is actually finished (or stopped, which empties
  // currentMoveSequence). Only re-enable the other action controls in that
  // "truly done" case - otherwise pausing mid-sequence prematurely
  // re-enables scramble/reset/solve/scan/manual moves, and hitting "play"
  // again to resume races against those being clickable. The "stop" action
  // isn't covered by this check alone (it can fire while playback is
  // already paused and no loop is in flight to reach here), so it also
  // calls finalizePlaybackControls() directly - see handleControlAction.
  if (currentMoveIndex >= currentMoveSequence.length) {
    finalizePlaybackControls();
  }
}

// Re-enable the action controls that setActionControlsDisabled(true) turned
// off for the duration of move-sequence playback. Called once playback is
// genuinely over (continueMoveSequence ran out of moves, or "stop" was
// pressed) - never on a plain pause, which must leave the controls disabled.
function finalizePlaybackControls() {
  isExecutingMoves = false;
  setActionControlsDisabled(false);
}

// Call createControlButtons after scene setup
createControlButtons();

animate();

// Add window resize listener to handle orientation changes
window.addEventListener("resize", () => {
  // Your existing resize handler code...

  // Force update of control buttons position if they're visible
  const controls = document.getElementById("moveControls");
  if (controls && controls.style.display !== "none") {
    controls.style.display = "flex"; // Refresh flex layout
  }
});

// Replace the existing getRandomMove function
function getRandomMove(lastTwoMoves = []) {
  const faces = ["right", "left", "up", "down", "front", "back"];

  // Define opposite faces for better move selection
  const opposites = {
    right: "left",
    left: "right",
    up: "down",
    down: "up",
    front: "back",
    back: "front",
  };

  // Remove faces that would create redundant sequences
  let availableFaces = [...faces];
  if (lastTwoMoves.length > 0) {
    const lastFace = lastTwoMoves[0]?.face;
    if (lastFace) {
      // Avoid same face moves in sequence (like R R)
      availableFaces = availableFaces.filter((f) => f !== lastFace);
      // Avoid opposite face moves (like R L)
      availableFaces = availableFaces.filter((f) => f !== opposites[lastFace]);
    }

    // Avoid parallel face patterns (like U D U)
    if (lastTwoMoves.length > 1) {
      const secondLastFace = lastTwoMoves[1]?.face;
      if (
        lastFace &&
        secondLastFace &&
        opposites[lastFace] === secondLastFace
      ) {
        availableFaces = availableFaces.filter(
          (f) => f !== lastFace && f !== secondLastFace
        );
      }
    }
  }

  const face =
    availableFaces[Math.floor(Math.random() * availableFaces.length)];

  // Weighted move types for more natural scrambles
  const moveTypes = ["normal", "normal", "prime", "prime", "double"];
  const moveType = moveTypes[Math.floor(Math.random() * moveTypes.length)];

  return {
    face,
    moveType,
    toString() {
      return `${face.charAt(0).toUpperCase()}${
        moveType === "prime" ? "'" : moveType === "double" ? "2" : ""
      }`;
    },
  };
}

// Replace the existing scrambleCube function
async function scrambleCube() {
  if (isRotating || isExecutingMoves) return;

  const originalDuration = ROTATION_DURATION;
  ROTATION_DURATION = 100; // Faster scrambling speed

  isExecutingMoves = true;
  const moveCount = Math.floor(Math.random() * 6) + 20; // 20-25 moves
  const scrambleSequence = [];
  const lastTwoMoves = [];

  try {
    // Ensure first move includes all faces for better distribution
    const firstFace = ["right", "left", "up", "down", "front", "back"][
      Math.floor(Math.random() * 6)
    ];
    const firstMove = { face: firstFace, moveType: "normal" };
    scrambleSequence.push(firstMove);
    lastTwoMoves.unshift(firstMove);
    await rotateFace(firstMove.face, true, true);

    // Generate remaining moves
    for (let i = 1; i < moveCount; i++) {
      const move = getRandomMove(lastTwoMoves);
      scrambleSequence.push(move);

      // Keep track of last two moves for better move selection
      lastTwoMoves.unshift(move);
      if (lastTwoMoves.length > 2) lastTwoMoves.pop();

      // Execute the move
      if (move.moveType === "double") {
        const label = faceToLetter[move.face] + "2";
        await rotateFace(move.face, true, true, label);
        await rotateFace(move.face, true, true, label);
      } else {
        await rotateFace(move.face, move.moveType !== "prime", true);
      }

      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Ensure last move isn't redundant
    while (scrambleSequence.length < moveCount) {
      const lastMove = getRandomMove(lastTwoMoves);
      if (
        lastMove.face !== scrambleSequence[scrambleSequence.length - 1].face
      ) {
        scrambleSequence.push(lastMove);
        if (lastMove.moveType === "double") {
          const label = faceToLetter[lastMove.face] + "2";
          await rotateFace(lastMove.face, true, true, label);
          await rotateFace(lastMove.face, true, true, label);
        } else {
          await rotateFace(lastMove.face, lastMove.moveType !== "prime", true);
        }
      }
    }
  } finally {
    ROTATION_DURATION = originalDuration;
    isExecutingMoves = false;
  }
}

// Add this function to reset the cube
function resetCube() {
  if (isRotating || isExecutingMoves) return;

  // Update colors of existing cubies to solved state
  cubeGroup.children.forEach((cubie) => {
    // Get the original position from the cubie's matrix
    const matrix = new THREE.Matrix4();
    matrix.copy(cubie.matrix);

    // Get the world position and round it to nearest integer
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);

    const [x, y, z] = [
      Math.round(position.x),
      Math.round(position.y),
      Math.round(position.z),
    ];

    // Reset rotation
    cubie.rotation.set(0, 0, 0);
    cubie.updateMatrix();

    // Update materials for each face
    // Order: right, left, top, bottom, front, back
    const newColors = [
      x === 1 ? cubeColors.red : 0x282828, // right
      x === -1 ? cubeColors.orange : 0x282828, // left
      y === 1 ? cubeColors.white : 0x282828, // top
      y === -1 ? cubeColors.yellow : 0x282828, // bottom
      z === 1 ? cubeColors.green : 0x282828, // front
      z === -1 ? cubeColors.blue : 0x282828, // back
    ];

    // Update each face's color
    cubie.material.forEach((material, index) => {
      material.color.setHex(newColors[index]);
    });

    // Reset position to original grid position
    cubie.position.set(x, y, z);
  });

  // Reset group rotation
  cubeGroup.rotation.set(0, 0, 0);
  cubeGroup.updateMatrix();

  // Reset move history and counters
  moveHistory = [];
  moveCount = 0;
  currentMoveIndex = 0;
  currentMoveSequence = [];
  isExecutingMoves = false;
  isPaused = false;

  // Clear input if it exists
  const input = document.querySelector("textarea");
  if (input) {
    input.value = "";
  }

  // Reset controls display
  const moveButton = document.getElementById("moveButton");
  const moveControls = document.getElementById("moveControls");
  if (moveButton && moveControls) {
    moveButton.style.display = "block";
    moveControls.style.display = "none";
  }
}

// Add this function to get the current 3D cube state
function getCurrentCubeState() {
  const state = Array(6)
    .fill()
    .map(() => Array(9).fill(null));

  function getFaceIndex(normal) {
    // Round to handle floating point precision issues
    const x = Math.round(normal.x * 100) / 100;
    const y = Math.round(normal.y * 100) / 100;
    const z = Math.round(normal.z * 100) / 100;

    if (Math.abs(y - 1) < 0.1) return 0; // Up (white)
    if (Math.abs(z - 1) < 0.1) return 1; // Front (green)
    if (Math.abs(x - 1) < 0.1) return 2; // Right (red)
    if (Math.abs(z + 1) < 0.1) return 3; // Back (blue)
    if (Math.abs(x + 1) < 0.1) return 4; // Left (orange)
    if (Math.abs(y + 1) < 0.1) return 5; // Down (yellow)
    return -1;
  }

  function getStickerPosition(localPos, normal) {
    // Round positions to handle floating point precision
    const x = Math.round(localPos.x);
    const y = Math.round(localPos.y);
    const z = Math.round(localPos.z);

    let row, col;

    // Determine row and column based on face orientation
    if (Math.abs(normal.y) > 0.9) {
      // Up/Down faces
      row = normal.y > 0 ? z + 1 : -z + 1; // Changed for Up face
      col = x + 1;
    } else if (Math.abs(normal.z) > 0.9) {
      // Front/Back faces
      row = -y + 1;
      col = normal.z > 0 ? x + 1 : -x + 1;
    } else {
      // Left/Right faces
      row = -y + 1;
      col = normal.x > 0 ? -z + 1 : z + 1; // Fixed for Right/Left faces
    }

    // Add a small random offset to prevent z-fighting with other arrows
    const randomOffset = 0.01;
    localPos.x += (Math.random() - 0.5) * randomOffset;
    localPos.y += (Math.random() - 0.5) * randomOffset;
    localPos.z += (Math.random() - 0.5) * randomOffset;

    return row * 3 + col;
  }

  // Process each cubie
  cubeGroup.children.forEach((cubie) => {
    // Update world matrix to get correct positions
    cubie.updateMatrixWorld(true);
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(cubie.matrixWorld);

    // Process each face of the cubie
    cubie.material.forEach((material, faceIndex) => {
      // Skip black/hidden faces
      if (material.color.getHex() === 0x282828) return;

      // Get face normal in world space
      const normal = new THREE.Vector3();
      switch (faceIndex) {
        case 0:
          normal.set(1, 0, 0);
          break; // right
        case 1:
          normal.set(-1, 0, 0);
          break; // left
        case 2:
          normal.set(0, 1, 0);
          break; // top
        case 3:
          normal.set(0, -1, 0);
          break; // bottom
        case 4:
          normal.set(0, 0, 1);
          break; // front
        case 5:
          normal.set(0, 0, -1);
          break; // back
      }

      // Transform normal to world space
      normal.applyQuaternion(cubie.quaternion);

      const faceIdx = getFaceIndex(normal);
      if (faceIdx !== -1) {
        const stickerPos = getStickerPosition(position, normal);
        if (stickerPos >= 0 && stickerPos < 9) {
          const colorHex = material.color.getHex();
          state[faceIdx][stickerPos] = colorMap[colorHex];
        }
      }
    });
  });

  // Fill any remaining nulls with 'X' (should not happen in a valid state)
  state.forEach((face) => {
    face.forEach((sticker, index) => {
      if (sticker === null) {
        console.warn(`Missing sticker at position ${index}`);
        face[index] = "X";
      }
    });
  });

  return state;
}

function removePopup(popup) {
  if (popup && popup.parentNode) {
    document.body.removeChild(popup);
  }
}

function showErrorPopup(message) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.textContent = message;
  document.body.appendChild(popup);

  // Remove popup after 3 seconds
  setTimeout(() => removePopup(popup), 3000);
}

// Informational popup (e.g. "waking up the server") that stays visible until
// the caller explicitly removes it via the returned element + removePopup().
function showInfoPopup(message) {
  const popup = document.createElement("div");
  popup.className = "popup info";
  popup.textContent = message;
  document.body.appendChild(popup);
  return popup;
}


// Create moves count container (initially hidden)
const movesCountContainer = document.getElementById("movesCountContainer");
if (!movesCountContainer) {
  const newContainer = document.createElement("div");
  newContainer.id = "movesCountContainer";
  document.body.appendChild(newContainer);
}

function adjustMovesCountContainer() {
  const inputContainer = document.getElementById('inputContainer');
  const movesCountContainer = document.getElementById('movesCountContainer');
  
  if (inputContainer && movesCountContainer) {
    const inputContainerHeight = inputContainer.offsetHeight;
    const offset = 30; // Adjust this value to set the desired distance above the inputContainer
    movesCountContainer.style.bottom = `${inputContainerHeight + offset}px`;
    movesCountContainer.style.left = window.getComputedStyle(inputContainer).left;
    movesCountContainer.style.width = window.getComputedStyle(inputContainer).width;
  }
}

// Adjust the position on window load and resize
// window.addEventListener('load', adjustMovesCountContainer);

// Function to toggle between normal and solution states
function toggleSolutionState(showSolution, moveCount = 0,moves = "") {
  let movesCountContainer = document.getElementById("movesCountContainer");
  const moveButton = document.getElementById("moveButton");
  const moveInput = document.querySelector("textarea");
  const moveControls = document.getElementById("moveControls");

  // Add safety check for all elements
  // if (!movesCountContainer || !moveButton || !moveInput) {
  //   if(!movesCountContainer)
  //     console.warn("Required elements not found movesCountContainer");
  //   else if(!moveButton)
  //     console.warn("Required elements not found moveButton");
  //   else
  //     console.warn("Required elements not found moveInput");
  //   return;
  // }

  if (showSolution && moveCount > 0) {
    // console.log(moveCount)
    // console.log(movesCountContainer)
    if(movesCountContainer == null){
        const container = document.createElement("div");
        container.id = "movesCountContainer";
        document.body.appendChild(container);
        movesCountContainer = container;
    }
    adjustMovesCountContainer();
    movesCountContainer.style.display = "block";
    movesCountContainer.textContent = `Number of Moves: ${moveCount}`;
    moveButton.textContent = "Show Steps";
    // moveInput.style.height = "clamp(35px, 6vh, 45px)";
    moveInput.value = moves;
  } else {
    if(movesCountContainer)
      movesCountContainer.style.display = "none";
    if(moveControls)
      moveControls.style.display = "none";
    moveButton.textContent = "Execute Moves";
    moveInput.style.height = "clamp(45px, 8vh, 60px)";
    moveInput.value = "";
  }
}

// Modify the existing solve button click handler (outside this function)
const existingSolveButton = document.querySelector(".solve-button"); // Update selector as needed
if (existingSolveButton) {
  existingSolveButton.addEventListener("click", () => {
    toggleSolutionState(true, numberOfMoves); // Replace numberOfMoves with actual value
  });
}

// Modify the stop button action in handleControlAction
const originalHandleControlAction = handleControlAction;
handleControlAction = function (action) {
  if (action === "stop") {
    toggleSolutionState(false);
  }
  originalHandleControlAction(action);
};


function createActionButtons() {
    // Create grid container
    // Create Grid Container
const gridContainer = document.createElement("div");
gridContainer.id = "gridContainer";  // Added an ID for CSS targeting
document.body.appendChild(gridContainer);

// Create Scramble Button
const scrambleButton = document.createElement("button");
scrambleButton.textContent = "Scramble";
scrambleButton.classList.add("scrambleButton","gridButton");
scrambleButton.addEventListener("click", async () => {
    if (!isRotating && !isExecutingMoves) {
        setActionControlsDisabled(true);
        scrambleButton.textContent = "Scrambling...";
        const moveButton = document.getElementById("moveButton");
        const moveControls = document.getElementById("moveControls");
        const moveInput = document.querySelector("textarea");
        const movesCountContainer = document.getElementById("movesCountContainer");
        
        const existingMovesContainer = document.querySelector("#movesCountContainer");
        if (existingMovesContainer) existingMovesContainer.remove();
        
        if (moveButton) moveButton.style.display = "block";
        if (moveControls) moveControls.style.display = "none";
        if (moveInput) moveInput.value = "";
        if (movesCountContainer) movesCountContainer.style.display = "none";

        await scrambleCube();
        setActionControlsDisabled(false);
        scrambleButton.textContent = "Scramble";
    }
});

// Create Reset Button
const resetButton = document.createElement("button");
resetButton.textContent = "Reset";
resetButton.classList.add("resetButton","gridButton");
resetButton.addEventListener("click", () => {
    resetCube();

    const moveButton = document.getElementById("moveButton");
    const moveControls = document.getElementById("moveControls");
    const moveInput = document.querySelector("textarea");
    const movesCountContainer = document.getElementById("movesCountContainer");

    const existingMovesContainer = document.querySelector("#movesCountContainer");
    if (existingMovesContainer) existingMovesContainer.remove();
    
    if (moveButton) moveButton.style.display = "block";
    if (moveControls) moveControls.style.display = "none";
    if (moveInput) moveInput.value = "";
    if (movesCountContainer) movesCountContainer.style.display = "none";
});

const solveButton = document.createElement("button");
// solveButton.id = "solveButton";
solveButton.textContent = "Solve";
solveButton.classList.add("solveButton","gridButton");

// The event listeners remain the same as in your original code
solveButton.addEventListener("click", async () => {
  if (isRotating || isExecutingMoves) return;
    const currentState = getCurrentCubeState();

    const isValid = currentState.every((face) =>
        face.every((sticker) => sticker !== "X")
    );
    if (!isValid) {
        showErrorPopup("Warning: Some stickers could not be properly detected!");
        return;
    }

    try {
        setActionControlsDisabled(true);
        solveButton.textContent = "Solving...";

        await ensureServerAwake();

        const response = await fetch(`${BACKEND_URL}/api/solve/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                cube_state: currentState,
            }),
        });

        if (!response.ok) {
            showErrorPopup("Something went wrong while solving the cube");
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Solution:", data);

        if (data.status !== "Solved") {
            showErrorPopup(data.message || "Failed to solve cube");
            return;
        }

        if(data.no_of_moves == 0){
          showErrorPopup("Cube already in solved state");
          return;
        }

        toggleSolutionState(true, data.no_of_moves, data.moves);
        // const moveButton = document.getElementById("moveButton");
        // const moveControls = document.getElementById("moveControls");
        // if (moveButton && moveControls) {
        //     moveButton.style.display = "block";
        //     moveButton.textContent = "Show Steps";
        //     moveControls.style.display = "none";
        // }

        // const moveInput = document.querySelector("textarea");
        // if (moveInput) {
        //     moveInput.value = data.moves;
        // }

        // const container = document.createElement("div");
        // container.id = "movesCountContainer";
        // container.textContent = `Number of Moves: ${data.no_of_moves}`;
        // document.body.appendChild(container);

    } catch (error) {
        console.error("Error solving cube:", error);
        showErrorPopup("Something went wrong while solving the cube");
    } finally {
        setActionControlsDisabled(false);
        solveButton.textContent = "Solve";
    }
});

const scanButton = document.createElement("button");
// scanButton.id = "scanButton";
scanButton.classList.add("scanButton","gridButton");
scanButton.textContent = "Scan";

scanButton.addEventListener("click", async () => {
    if (isRotating || isExecutingMoves) return;

    setActionControlsDisabled(true);
    const originalScanText = scanButton.textContent;
    scanButton.textContent = "Loading...";

    await ensureServerAwake();

    window.location.href = `${BACKEND_URL}/api/scan/`;

    // In case navigation is blocked/cancelled, restore the button rather
    // than leaving it disabled forever.
    setActionControlsDisabled(false);
    scanButton.textContent = originalScanText;
});

const existingMovesContainer = document.querySelector("#movesCountContainer");
if (existingMovesContainer) existingMovesContainer.remove();

scanButton.addEventListener("mouseenter", () => {
    scanButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
    scanButton.style.background =
        "linear-gradient(165deg, rgba(65, 145, 200, 0.95), rgba(55, 125, 180, 0.95))";
});

scanButton.addEventListener("mouseleave", () => {
    scanButton.style.borderColor = "rgba(255, 255, 255, 0.15)";
    scanButton.style.background =
        "linear-gradient(165deg, rgba(55, 135, 190, 0.95), rgba(45, 115, 170, 0.95))";
});

// Disable/enable every action control (grid buttons, manual move buttons,
// and the move-sequence input) as one unit, so scramble and solve/move
// playback can't be interrupted or overlapped by anything else.
setActionControlsDisabled = function (disabled) {
  [scrambleButton, resetButton, solveButton, scanButton].forEach((btn) => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? "0.5" : "1";
  });

  manualMoveButtons.forEach((btn) => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? "0.5" : "1";
  });

  const moveButton = document.getElementById("moveButton");
  if (moveButton) moveButton.disabled = disabled;

  const moveInput = document.querySelector("textarea");
  if (moveInput) moveInput.disabled = disabled;
};

// Add buttons to grid container
gridContainer.appendChild(scrambleButton);
gridContainer.appendChild(resetButton);
gridContainer.appendChild(solveButton);
gridContainer.appendChild(scanButton);


    // Add grid container to document
    document.body.appendChild(gridContainer);
}

// Call this function after scene setup
createActionButtons();


function applyCubeString(cubeString) {
  if (!cubeString || cubeString.length !== 54) {
    console.error('Invalid cube string:', cubeString);
    return;
  }

  

  // Mapping from letters to cube face colors
  const colorMapping = {
    'W': cubeColors.white,  // White
    'G': cubeColors.green,  // Green
    'R': cubeColors.red,    // Red
    'B': cubeColors.blue,   // Blue
    'O': cubeColors.orange, // Orange
    'Y': cubeColors.yellow  // Yellow
  };

  // Reset cube rotation (white on top, green in front)
  cubeGroup.rotation.set(0, 0, 0);
  cubeGroup.updateMatrix();

  // Face definitions with correct offsets
  const faces = {
    top: { colors: cubeString.slice(0, 9), materialIndex: 2, offset: { x: 0, y: 1, z: 0 } },      // White (top)
    front: { colors: cubeString.slice(9, 18), materialIndex: 4, offset: { x: 0, y: 0, z: 1 } },   // Green (front)
    right: { colors: cubeString.slice(18, 27), materialIndex: 0, offset: { x: 1, y: 0, z: 0 } },  // Red (right)
    back: { colors: cubeString.slice(27, 36), materialIndex: 5, offset: { x: 0, y: 0, z: -1 } },  // Blue (back)
    left: { colors: cubeString.slice(36, 45), materialIndex: 1, offset: { x: -1, y: 0, z: 0 } },  // Orange (left)
    bottom: { colors: cubeString.slice(45, 54), materialIndex: 3, offset: { x: 0, y: -1, z: 0 } } // Yellow (bottom)
  };

  // Find cubie by exact position
  function getCubieAt(x, y, z) {
    return cubeGroup.children.find(cubie =>
      Math.abs(cubie.position.x - x) < 0.1 &&
      Math.abs(cubie.position.y - y) < 0.1 &&
      Math.abs(cubie.position.z - z) < 0.1
    );
  }

  // Iterate over each face
  Object.entries(faces).forEach(([face, { colors, materialIndex, offset }]) => {
    for (let i = 0; i < 9; i++) {
      // Calculate grid position (row and col range from -1 to 1)
      const row = Math.floor(i / 3) - 1; // Row: -1, 0, 1
      const col = (i % 3) - 1;          // Col: -1, 0, 1

      // Calculate xPos, yPos, zPos based on face orientation
    let xPos, yPos, zPos;
    switch (face) {
      case "top": // White face
        xPos = col;
        yPos = 1;
        zPos = row;
        break;
      case "front": // Green face
        xPos = col;
        yPos = -row;
        zPos = 1;
        break;
      case "back": // Blue face
        xPos = -col;
        yPos = -row;
        zPos = -1;
        break;
      case "right": // Red face
        xPos = 1;
        yPos = -row;
        zPos = -col;
        break;
      case "left": // Orange face
        xPos = -1;
        yPos = -row;
        zPos = col;
        break;
      case "bottom": // Yellow face
        xPos = col;
        yPos = -1;
        zPos = -row;
        break;
    }



      // Find the cubie at the calculated position
      const cubie = getCubieAt(xPos, yPos, zPos);
      const color = colorMapping[colors[i]];

      if (cubie && cubie.material[materialIndex]) {
        // Apply color to the correct face of the cubie
        cubie.material[materialIndex].color.setHex(color);
      } else {
        console.warn(`No cubie found at (${xPos}, ${yPos}, ${zPos})`);
      }
    }
  });

  console.log('Cube updated with provided string.');
}

window.addEventListener('load', () => {
  // console.log("Reload")
  
  // const moveInput = document.querySelector("textarea");
  // if (moveInput) {
  //   moveInput.value = "";
  // }
  toggleSolutionState(false);

  // Parse the URL for the 'cubeString' query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const cubeString = urlParams.get('cubeString');

  if (cubeString) {
      // console.log('Retrieved cube string:', cubeString);
      // Apply the cube state to your Rubik's Cube visualization
      applyCubeString(cubeString);

      // Optionally clear the URL for a clean look (removes ?cubeString=...)
      window.history.replaceState({}, document.title, window.location.pathname);
  } else {
      // console.log('No cube string found in the URL.');
  }
});
window.addEventListener('resize', adjustMovesCountContainer);
