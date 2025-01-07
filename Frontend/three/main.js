import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

let ROTATION_DURATION = 300; // milliseconds

// Keep only one instance of touch coordinates
let touchStartX = 0;
let touchStartY = 0;

renderer.domElement.addEventListener("touchstart", (event) => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
});

renderer.domElement.addEventListener("touchend", (event) => {
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  const deltaY = event.changedTouches[0].clientY - touchStartY;

  if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) < 50) return;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    rotateFace(deltaX > 0 ? "right" : "left");
  } else {
    rotateFace(deltaY > 0 ? "down" : "up");
  }
});

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
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
function rotateFace(face, clockwise = true, skipArrow = false) {
  return new Promise((resolve) => {
    if (isRotating || isTypingMoves) return;
    isRotating = true;

    // Remove existing arrow
    if (rotationArrow) {
      scene.remove(rotationArrow);
      rotationArrow = null;
    }

    // Only create arrow if not skipping
    if (!skipArrow) {
      rotationArrow = createArrowForFace(face, clockwise);
      scene.add(rotationArrow);
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


function createMoveButtons() {
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("button-container");

  const moves = [
    { label: "U", face: "up", clockwise: true },
    { label: "F", face: "front", clockwise: true },
    { label: "R", face: "right", clockwise: true },
    { label: "B", face: "back", clockwise: true },
    { label: "L", face: "left", clockwise: true },
    { label: "D", face: "down", clockwise: true },
    { label: "U'", face: "up", clockwise: false },
    { label: "F'", face: "front", clockwise: false },
    { label: "R'", face: "right", clockwise: false },
    { label: "B'", face: "back", clockwise: false },
    { label: "L'", face: "left", clockwise: false },
    { label: "D'", face: "down", clockwise: false },
  ];

  moves.forEach(({ label, face, clockwise }) => {
    const button = document.createElement("button");
    button.textContent = label;

    button.addEventListener("click", () => rotateFace(face, clockwise));
    buttonContainer.appendChild(button);
  });

  document.body.appendChild(buttonContainer);
}
createMoveButtons();

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
    currentMoveSequence = sequence.split(/\s+/);
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
      await continueMoveSequence();
    } catch (error) {
      console.error("Error executing moves:", error);
    } finally {
      isExecutingMoves = false;
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


// Add this function to handle control actions
async function handleControlAction(action) {
  switch (action) {
    case "prev":
      if (currentMoveIndex > 0 && !isRotating) {
        currentMoveIndex--;
        const lastMove = currentMoveSequence[currentMoveIndex];
        const face = lastMove.charAt(0).toLowerCase();
        const isDouble = lastMove.includes("2");
        const isCounterClockwise = lastMove.includes("'");

        let faceToRotate;
        switch (face) {
          case "r":
            faceToRotate = "right";
            break;
          case "l":
            faceToRotate = "left";
            break;
          case "u":
            faceToRotate = "up";
            break;
          case "d":
            faceToRotate = "down";
            break;
          case "f":
            faceToRotate = "front";
            break;
          case "b":
            faceToRotate = "back";
            break;
          default:
            console.error("Invalid move:", face);
            return;
        }

        if (isDouble) {
          // For double moves (U2), perform the same move again
          await rotateFace(faceToRotate, !isCounterClockwise);
          await rotateFace(faceToRotate, !isCounterClockwise);
        } else {
          // For single moves (U or U'), perform the inverse
          await rotateFace(faceToRotate, isCounterClockwise);
        }
      }
      break;
    case "next":
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
      isExecutingMoves = false;

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
      face === "r"
        ? "right"
        : face === "l"
        ? "left"
        : face === "u"
        ? "up"
        : face === "d"
        ? "down"
        : face === "f"
        ? "front"
        : face === "b"
        ? "back"
        : null,
      !isCounterClockwise
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
        await rotateFace(move.face, true, true);
        await rotateFace(move.face, true, true);
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
          await rotateFace(lastMove.face, true, true);
          await rotateFace(lastMove.face, true, true);
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

function showErrorPopup(message) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.textContent = message;
  document.body.appendChild(popup);

  // Remove popup after 3 seconds
  setTimeout(() => {
    if (popup.parentNode) {
      document.body.removeChild(popup);
    }
  }, 3000);
}


// Create moves count container (initially hidden)
const movesCountContainer = document.getElementById("movesCountContainer");
if (!movesCountContainer) {
  const newContainer = document.createElement("div");
  newContainer.id = "movesCountContainer";
  document.body.appendChild(newContainer);
}


// Function to toggle between normal and solution states
function toggleSolutionState(showSolution, moveCount = 0) {
  const movesCountContainer = document.getElementById("movesCountContainer");
  const moveButton = document.getElementById("moveButton");
  const moveInput = document.querySelector("textarea");

  // Add safety check for all elements
  if (!movesCountContainer || !moveButton || !moveInput) {
    console.warn("Required elements not found");
    return;
  }

  if (showSolution) {
    movesCountContainer.style.display = "block";
    movesCountContainer.textContent = `Number of Moves: ${moveCount}`;
    moveButton.textContent = "Show Steps";
    moveInput.style.height = "clamp(35px, 6vh, 45px)";
  } else {
    movesCountContainer.style.display = "none";
    moveButton.textContent = "Execute Moves";
    moveInput.style.height = "clamp(45px, 8vh, 60px)";
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
scrambleButton.classList.add("scrambleButton");
scrambleButton.addEventListener("click", async () => {
    if (!isRotating && !isExecutingMoves) {
        scrambleButton.disabled = true;
        scrambleButton.style.opacity = "0.5";
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
        scrambleButton.disabled = false;
        scrambleButton.style.opacity = "1";
    }
});

// Create Reset Button
const resetButton = document.createElement("button");
resetButton.textContent = "Reset";
resetButton.classList.add("resetButton");
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
solveButton.id = "solveButton";
solveButton.textContent = "Solve";

// The event listeners remain the same as in your original code
solveButton.addEventListener("click", async () => {
    const currentState = getCurrentCubeState();

    const isValid = currentState.every((face) =>
        face.every((sticker) => sticker !== "X")
    );
    if (!isValid) {
        showErrorPopup("Warning: Some stickers could not be properly detected!");
        return;
    }

    try {
        solveButton.disabled = true;
        solveButton.textContent = "Solving...";
        solveButton.style.opacity = "0.7";

        const response = await fetch("http://127.0.0.1:8000/api/solve/", {
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

        const moveButton = document.getElementById("moveButton");
        const moveControls = document.getElementById("moveControls");
        if (moveButton && moveControls) {
            moveButton.style.display = "block";
            moveButton.textContent = "Show Steps";
            moveControls.style.display = "none";
        }

        const moveInput = document.querySelector("textarea");
        if (moveInput) {
            moveInput.value = data.moves;
        }

        const container = document.createElement("div");
        container.id = "movesCountContainer";
        container.textContent = `Number of Moves: ${data.no_of_moves}`;
        document.body.appendChild(container);

    } catch (error) {
        console.error("Error solving cube:", error);
        showErrorPopup("Something went wrong while solving the cube");
    } finally {
        solveButton.disabled = false;
        solveButton.textContent = "Solve";
        solveButton.style.opacity = "1";
    }
});

const scanButton = document.createElement("button");
scanButton.id = "scanButton";
scanButton.textContent = "Scan";

scanButton.addEventListener("click", () => {
    window.location.href = "http://127.0.0.1:8000/api/scan/";
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
  
const moveControls = document.getElementById("moveControls");
moveControls.style.display = "none";
  // Parse the URL for the 'cubeString' query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const cubeString = urlParams.get('cubeString');

  if (cubeString) {
      console.log('Retrieved cube string:', cubeString);
      // Apply the cube state to your Rubik's Cube visualization
      applyCubeString(cubeString);

      // Optionally clear the URL for a clean look (removes ?cubeString=...)
      window.history.replaceState({}, document.title, window.location.pathname);
  } else {
      console.log('No cube string found in the URL.');
  }
});