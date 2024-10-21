import cv2 as cv
import numpy as np

cap = cv.VideoCapture(0)

def print_cube(cube_faces):
    # Convert the face arrays to 3x3 grid
    def format_face(face):
        return [face[:3], face[3:6], face[6:]]

    # Get each face in grid format
    up = format_face(cube_faces[0])    # White
    right = format_face(cube_faces[1])   # Red
    front = format_face(cube_faces[2])  # Green
    down = format_face(cube_faces[3])  # Yellow
    left = format_face(cube_faces[4])   # Orange
    back = format_face(cube_faces[5]) # Blue

    # Print the cube in a cross layout
    print("Cube Faces:")

    # Top face (White)
    print("    ", " ".join(up[0]))
    print("    ", " ".join(up[1]))
    print("    ", " ".join(up[2]))

    # Left (Orange), Front (Green), Right (Red), Back (Blue) faces in one row
    for i in range(3):
        print(" ".join(left[i]), " ", " ".join(front[i]), " ", " ".join(right[i]), " ", " ".join(back[i]))

    # Bottom face (Yellow)
    print("    ", " ".join(down[0]))
    print("    ", " ".join(down[1]))
    print("    ", " ".join(down[2]))

color_ranges = {
    'white': (np.array([0, 0, 200]), np.array([180, 30, 255])),
    'red': [
        (np.array([0, 100, 100]), np.array([10, 255, 255])),  # First red range
        (np.array([170, 100, 100]), np.array([180, 255, 255]))  # Second red range
    ],
    'green': (np.array([40, 100, 100]), np.array([85, 255, 255])),
    'orange': (np.array([10, 150, 150]), np.array([25, 255, 255])),
    'blue': (np.array([100, 150, 100]), np.array([130, 255, 255])),
    'yellow': (np.array([20, 150, 150]), np.array([30, 255, 255]))
}

color_initials = {
    'white': 'W',
    'red': 'R',
    'green': 'G',
    'orange': 'O',
    'blue': 'B',
    'yellow': 'Y'
}

# Initialize a 6x9 grid for cube colors
cube_faces = [['' for _ in range(9)] for _ in range(6)]
facecount = 0

while True:
    isTrue, frame = cap.read()

    if isTrue:
        grey_frame = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        noiseless_frame = cv.fastNlMeansDenoising(grey_frame, None, 20, 7, 7)
        blurred_frame = cv.GaussianBlur(noiseless_frame, (3, 3), 0)  # Use Gaussian Blur
        canny_frame = cv.Canny(blurred_frame, 50, 150)
        cv.imshow('canny',canny_frame)
        dilated_frame = cv.dilate(canny_frame, cv.getStructuringElement(cv.MORPH_RECT, (5,5)))

        contours, _ = cv.findContours(dilated_frame, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

        # Showing all the contours found
        contour_frame = cv.drawContours(frame.copy(), contours, -1, (0, 255, 0), 2)
        cv.imshow('Contours', contour_frame)

        sticker_frame = frame.copy()
        detected_colors = []  #empty color list for each frame

        for contour in contours:
            # Get a polygon approximation for the contour 
            approx = cv.approxPolyDP(contour, 0.1 * cv.arcLength(contour, True), True)

            # Check the contour has four sides
            if len(approx) == 4:
                # Get dimensions of the contour and calculate w/h ratio and area
                x, y, w, h = cv.boundingRect(approx)
                ratio = float(w) / h
                area = cv.contourArea(approx)

                # Check the contour meets the right dimensions (sticker size)
                if 0.8 <= ratio <= 1.2 and 30 <= w <= 80 and area >= 900:
                    cv.drawContours(sticker_frame, [approx], -1, (0, 0, 0), 2)

                    # Extract the ROI (sticker)
                    roi = frame[y:y + h, x:x + w]
                    hsv_roi = cv.cvtColor(roi, cv.COLOR_BGR2HSV)

                    # Check which color occupies the largest portion of the contour
                    color_areas = {}

                    for color, bounds in color_ranges.items():
                        if color == 'red':  # Handle both red ranges
                            mask1 = cv.inRange(hsv_roi, *bounds[0])
                            mask2 = cv.inRange(hsv_roi, *bounds[1])
                            mask = mask1 | mask2
                        else:
                            mask = cv.inRange(hsv_roi, *bounds)

                        # Calculate how much of the area is covered by the color
                        white_pixels = cv.countNonZero(mask)
                        color_ratio = white_pixels / area

                        color_areas[color] = color_ratio

                    # Determine the dominant color (highest ratio)
                    detected_color = max(color_areas, key=color_areas.get)
                    detected_colors.append(color_initials[detected_color])

                    # Put the detected color text on the image (white text with black outline)
                    cv.putText(sticker_frame, detected_color, (x + 10, y + 10),
                               cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv.LINE_AA)
                    cv.putText(sticker_frame, detected_color, (x + 10, y + 10),
                               cv.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv.LINE_AA)

        # Check for user input
        key = cv.waitKey(1) & 0xFF
        if key == ord('c'):  # If 'c' key is pressed
            cv.imshow('Detected Colors', sticker_frame)
            cv.waitKey(0)
            cv.destroyWindow('Detected Colors')
            if len(detected_colors) == 9:  # Check if exactly 9 colors are detected
                print("9 colors detected. Proceeding to store colors.")
                print("Detected colors:", detected_colors)
                cube_faces[facecount] = detected_colors
                facecount += 1

                # Store colors in cube_faces or perform further processing here
                # Example: Assign detected_squares to a specific face
                # cube_faces[face_index] = [color for color, _ in detected_squares]
            else:
                print(f"Error: Detected {len(detected_colors)} colors. Please ensure 9 colors are visible.")
            if facecount == 6:
                print("Cube faces detected successfully!")
                print_cube(cube_faces)
        if key == ord('q'):  # If 'q' key is pressed, break the loop
            print("Cube detection aborted.")
            break

        cv.imshow('Detected Sticker Squares', sticker_frame)

cap.release()
cv.destroyAllWindows()