# Rubik's Cube Solver & Scanner

This project is a web-based application that allows users to scan a scrambled Rubik's Cube and solve it step-by-step with minimal moves. It leverages computer vision for detecting cube colors, solving algorithms for determining the optimal solution, and an intuitive user interface for guiding the user through the solution.

## Features

### 1. Cube Scanning

- Users can scan the six faces of the Rubik's Cube using their device's camera.
- The application detects and maps the colors of the cube in real-time.

### 2. Optimal Cube Solving

- Solves the cube in around 20 moves (at max) using advanced algorithms like Kociemba's algorithm.
- Provides a step-by-step guide to solving the cube.

### 3. 3D Cube Visualization

- Displays a virtual 3D representation of the cube.
- Animates each move for a clear understanding of the solution.

### 4. Responsive and Intuitive UI

- User-friendly design with interactive controls.

## Technology Stack

### Frontend

- HTML/CSS/JavaScript: Core structure and styling.
- Three.js: For 3D cube representation and animations.

### Backend

- Django: Manages the server-side logic for solving and scanning the cube.

### Computer Vision

- OpenCV: For scanning and detecting cube colors using a camera.
