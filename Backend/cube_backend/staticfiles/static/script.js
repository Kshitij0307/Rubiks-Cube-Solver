const video = document.getElementById("cameraFeed");
const statusMessage = document.getElementById("statusMessage");
let currentStream = null;
let facingMode = "environment"; // Start with rear camera
let lastCapturedColors = null;

function showStatus(message, duration = 3000) {
statusMessage.textContent = message;
statusMessage.classList.add("show");
setTimeout(() => {
    statusMessage.classList.remove("show");
}, duration);
}

function getCSRFToken() {
const name = "csrftoken";
let cookieValue = null;
if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(
        cookie.substring(name.length + 1)
        );
        break;
    }
    }
}
return cookieValue;
}

async function captureImage() {
try {
    console.log("Starting capture...");  // Debug log
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;

    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    showStatus("Processing image...", 2000);

    canvas.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");

    console.log("Sending capture request...");  // Debug log
    try {
        const response = await fetch("https://rubiks-cube-solver-eyq4.onrender.com/api/scan/capture/", {
        method: "POST",
        body: formData,
        headers: {
            "X-CSRFToken": getCSRFToken(),
        }
        });

        console.log("Capture response received:", response.status);  // Debug log
        const data = await response.json();
        console.log("Capture data:", data);  // Debug log

        if (data.success) {
        lastCapturedColors = data.colors;
        showStatus("Colors detected successfully!", 3000);
        } else {
        lastCapturedColors = null;
        showStatus(
            data.message || "Failed to detect colors. Please try again.",
            5000
        );
        }

        if (data.image) {
        const processedImage = document.createElement("img");
        processedImage.src = `data:image/jpeg;base64,${data.image}`;
        processedImage.alt = "Processed cube face";

        const container = document.getElementById(
            "processedImageContainer"
        );
        container.innerHTML = "";
        container.appendChild(processedImage);
        container.style.display = "block";
        }
    } catch (error) {
        console.error("Error in capture:", error);  // Debug log
        showStatus("Failed to process image. Please try again.", 5000);
    }
    });
} catch (error) {
    console.error("Error capturing image:", error);
    showStatus("Failed to capture image. Please try again.", 5000);
}
}

async function initCamera() {
try {
    if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    }

    const constraints = {
    video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: facingMode,
    },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    currentStream = stream;
    document.querySelector(".loading").style.display = "none";
    showStatus("Camera connected successfully!");
} catch (err) {
    console.error("Error accessing camera:", err);
    showStatus("Camera access failed. Please check permissions.", 5000);
    document.querySelector(".loading").textContent =
    "Camera access failed";
}
}

async function switchCamera() {
facingMode = facingMode === "environment" ? "user" : "environment";
showStatus("Switching camera...");
await initCamera();
}

async function restartCamera() {
try {
    console.log("Starting reset...");  // Debug log
    const response = await fetch("https://rubiks-cube-solver-eyq4.onrender.com/api/scan/reset/", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
    }
    });
    
    console.log("Reset response received:", response.status);  // Debug log
    const data = await response.json();
    console.log("Reset data:", data);  // Debug log
    
    if (data.success) {
    showStatus("Resetting...", 1000);
    setTimeout(() => {
        window.location.reload();
    }, 1000);
    } else {
    showStatus("Failed to reset state", 3000);
    }
} catch (error) {
    console.error("Error in reset:", error);  // Debug log
    showStatus("Failed to reset state", 3000);
}
}

// Initialize camera when page loads
window.addEventListener("load", initCamera);

// Handle visibility change to restart camera when tab becomes visible
document.addEventListener("visibilitychange", () => {
if (document.visibilityState === "visible") {
    initCamera();
}
});

// Handle video errors
video.addEventListener("error", () => {
showStatus("Video error occurred. Trying to restart...", 3000);
setTimeout(initCamera, 1000);
});

async function verifyState() {
if (!lastCapturedColors) {
    showStatus("Please capture the image first!", 3000);
    return;
}

try {
    const response = await fetch("https://rubiks-cube-solver-eyq4.onrender.com/api/scan/verify/", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({
        colors: lastCapturedColors
    })
    });

    const data = await response.json();

    if (data.success) {
    if (data.complete_state && data.cube_string) {
        console.log("Complete cube state:", data.complete_state);
        showStatus("Cube scanned successfully! Redirecting...", 2000);
        setTimeout(() => {
            // Redirect with cubeString as a query parameter
            window.location.href = `http://localhost:5173/?cubeString=${encodeURIComponent(data.cube_string)}`;
        }, 2000);
    } else {
        showStatus(data.message, 3000);
    }
} else {
    showStatus(data.message || "Verification failed", 3000);
}

} catch (error) {
    console.error("Error verifying state:", error);
    showStatus("Failed to verify state. Please try again.", 3000);
}
}