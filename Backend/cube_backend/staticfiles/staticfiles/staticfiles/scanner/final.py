import cv2 as cv
import base64
import numpy as np

color_ranges = {
    'white': (np.array([0, 0, 200]), np.array([180, 30, 255])),
    'red': [
        (np.array([0, 100, 100]), np.array([10, 255, 255])),  # First red range
        (np.array([170, 100, 100]), np.array([180, 255, 255]))  # Second red range
    ],
    'green': (np.array([40, 100, 100]), np.array([85, 255, 255])),
    'orange': (np.array([5, 150, 150]), np.array([25, 255, 255])),
    'blue': (np.array([100, 150, 100]), np.array([130, 255, 255])),
    'yellow': (np.array([18, 100, 150]), np.array([32, 255, 255]))
}

color_initials = {
    'white': 'W',
    'red': 'R',
    'green': 'G',
    'orange': 'O',
    'blue': 'B',
    'yellow': 'Y'
}

def process_frame(frame):
    """Process a single frame and return detected colors and annotated image"""
    detected_colors = []
    sticker_frame = frame.copy()
    height, width = frame.shape[:2]
    
    grey_frame = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    canny = cv.Canny(grey_frame,50,150)
    blurred_frame = cv.GaussianBlur(canny, (7,7), 0)
    dilated_frame = cv.dilate(blurred_frame, cv.getStructuringElement(cv.MORPH_RECT, (7,7)))
    
    contours, _ = cv.findContours(dilated_frame, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)
    
    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = 0, 0
    
    for contour in contours:
        approx = cv.approxPolyDP(contour, 0.1 * cv.arcLength(contour, True), True)
        
        if len(approx) == 4:
            x, y, w, h = cv.boundingRect(approx)
            ratio = float(w) / h
            area = cv.contourArea(approx)
            
            if 0.8 <= ratio <= 1.2 and 30 <= w <= 80 and area >= 900:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x + w)
                max_y = max(max_y, y + h)
                cv.drawContours(sticker_frame, [approx], -1, (0, 0, 0), 2)
                
                roi = frame[y:y + h, x:x + w]
                hsv_roi = cv.cvtColor(roi, cv.COLOR_BGR2HSV)
                
                color_areas = {}
                for color, bounds in color_ranges.items():
                    if color == 'red':  # Handle both red ranges
                        mask1 = cv.inRange(hsv_roi, *bounds[0])
                        mask2 = cv.inRange(hsv_roi, *bounds[1])
                        mask = cv.bitwise_or(mask1, mask2)
                    else:
                        mask = cv.inRange(hsv_roi, *bounds)
                    
                    white_pixels = cv.countNonZero(mask)
                    color_ratio = white_pixels / area
                    color_areas[color] = color_ratio
                
                detected_color = max(color_areas, key=color_areas.get)
                detected_colors.append((color_initials[detected_color], x, y, w, h))
                
                # Add text to the image
                (text_width, text_height), _ = cv.getTextSize(detected_color, cv.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                centered_x = x + (w - text_width) // 2
                centered_y = y + (h + text_height) // 2
                
                # Draw text with outline
                cv.putText(sticker_frame, detected_color, (centered_x, centered_y),
                        cv.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2, cv.LINE_AA)
                cv.putText(sticker_frame, detected_color, (centered_x, centered_y),
                        cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv.LINE_AA)
    
    # If squares were detected, crop and resize
    if len(detected_colors) > 0:
        padding = 20
        crop_min_x = max(0, min_x - padding)
        crop_min_y = max(0, min_y - padding)
        crop_max_x = min(width, max_x + padding)
        crop_max_y = min(height, max_y + padding)
        
        # Crop the region containing squares
        cropped = sticker_frame[crop_min_y:crop_max_y, crop_min_x:crop_max_x]
        
        # Calculate scaling factor to maintain aspect ratio
        crop_height, crop_width = cropped.shape[:2]
        scale_w = width / crop_width
        scale_h = height / crop_height
        scale = min(scale_w, scale_h)
        
        # Calculate new dimensions
        new_width = int(crop_width * scale)
        new_height = int(crop_height * scale)
        
        # Resize the cropped image
        resized = cv.resize(cropped, (new_width, new_height))
        
        # Create a black canvas of original size
        final_image = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Calculate padding to center the resized image
        y_offset = (height - new_height) // 2
        x_offset = (width - new_width) // 2
        
        # Place the resized image in the center
        final_image[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized
        
        sticker_frame = final_image

    # Always encode and return the image
    _, buffer = cv.imencode('.jpg', sticker_frame)
    img_str = base64.b64encode(buffer).decode()
    
    if len(detected_colors) == 9:
        # Sort detected colors based on y-coordinates
        detected_colors_sorted_y = sorted(detected_colors, key=lambda item: item[2])

        # Define the top, middle, and bottom rows
        sorted_rows = []
        for i in range(0, 9, 3):
            unsorted_row = [detected_colors_sorted_y[i], detected_colors_sorted_y[i + 1], detected_colors_sorted_y[i + 2]]
            # Sort each row based on x-coordinates
            sorted_rows.append(sorted(unsorted_row, key=lambda item: item[1]))

        # Combine all rows in order
        detected_colors = sorted_rows[0] + sorted_rows[1] + sorted_rows[2]

        # Print the final detected colors
        final_colors = [color[0] for color in detected_colors]
        print("Final detected colors:", final_colors)

        return {
            'success': True,
            'colors': final_colors,
            'image': img_str,
            'message': 'Successfully detected 9 colors'
        }
    
    return {
        'success': False,
        'message': f'Detected {len(detected_colors)} colors instead of 9',
        'image': img_str,
        'colors': []
    }
