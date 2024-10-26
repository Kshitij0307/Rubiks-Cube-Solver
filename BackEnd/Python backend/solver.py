import cv2 as cv
import sys
from helper_methods import print_cube, solve_cube,store_face,draw_contours
from config import color_initials, color_ranges

cap = cv.VideoCapture(1)


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
        dilated_frame = cv.dilate(canny_frame, cv.getStructuringElement(cv.MORPH_RECT, (5, 5)))

        contours, _ = cv.findContours(dilated_frame, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

        sticker_frame = frame.copy()
        detected_colors = []  # Empty color list for each frame

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
                    detected_colors.append((color_initials[detected_color], x, y, w, h))

                    # Put the detected color text on the image (white text with black outline)
                    cv.putText(sticker_frame, detected_color, (x + 10, y + 10),
                               cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv.LINE_AA)
                    cv.putText(sticker_frame, detected_color, (x + 10, y + 10),
                               cv.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv.LINE_AA)

        # Check for user input
        key = cv.waitKey(1) & 0xFF
        if key == ord('c'):  # If 'c' key is pressed

            if len(detected_colors) == 9:  # Check if exactly 9 colors are detected

                # Sort detected colors based on their x-coordinates first, then y-coordinates
                detected_colors_sorted_x = sorted(detected_colors, key=lambda item: item[1])
                detected_colors_sorted_y = sorted(detected_colors, key=lambda item: item[2])

                # Define the top, middle, and bottom rows
                sorted_rows = []
                for i in range(0, 9, 3):
                    unsorted_row = [detected_colors_sorted_y[i], detected_colors_sorted_y[i + 1], detected_colors_sorted_y[i + 2]]
                    # Sort on x-position and append
                    sorted_rows.append(sorted(unsorted_row, key=lambda item: item[1]))

                # Re-order the list of square contours using sequence above
                detected_colors = sorted_rows[0] + sorted_rows[1] + sorted_rows[2]

                print("9 colors detected. Proceeding to store colors.")
                print("Detected color codes:", ' '.join([color[0] for color in detected_colors]))
                facecount = store_face(cube_faces,detected_colors,facecount)
                draw_contours(sticker_frame, detected_colors)
                cv.imshow('Detected Colors', sticker_frame)
                cv.waitKey(0)
                cv.destroyWindow('Detected Colors')

            else:
                print(f"Error: Detected {len(detected_colors)} colors. Please ensure 9 colors are visible.")
            if facecount == 6:
                print("Cube faces detected successfully!")
                print_cube(cube_faces)
                res,msg,move_count,moves = solve_cube(cube_faces)
                print()
                if(res):
                    print(f'Cube solved in {move_count} moves:')
                    print(moves)
                else:
                    print(msg)
                print()
                # Exit the program
                sys.exit()  # Terminate the program

        if key == ord('q'):  # If 'q' key is pressed, break the loop
            print("Cube detection aborted.")
            break

        cv.imshow('Detected Sticker Squares', sticker_frame)

cap.release()
cv.destroyAllWindows()
