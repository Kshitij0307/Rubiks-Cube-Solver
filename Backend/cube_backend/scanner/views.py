from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import cv2 as cv
import numpy as np
import base64
import json
from .final import process_frame
from collections import Counter

# Global variable to store cube state
cube_state = []
current_face = 0

def index(request):
    return render(request,'index.html')
    
@csrf_exempt
def capture(request):
    if request.method == 'POST':
        # print("Capture endpoint called!")  # Debug print
        try:
            # Get image from request
            if 'image' not in request.FILES:
                # print("No image file received")  # Debug print
                return JsonResponse({
                    'success': False,
                    'message': 'No image file received'
                }, status=400)

            # print("Processing image...")  # Debug print
            # Read image file
            image_file = request.FILES['image']
            image_bytes = image_file.read()
            
            # Convert to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            
            # Decode image
            image = cv.imdecode(nparr, cv.IMREAD_COLOR)
            
            if image is None:
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid image data'
                }, status=400)

            # Process the image
            result = process_frame(image)
            
            # Return the results
            return JsonResponse(result)
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error processing image: {str(e)}'
            }, status=400)
    
    return JsonResponse({
        'success': False,
        'message': 'Only POST requests are allowed'
    }, status=400)

def check_validity(cube_faces):
    # Check if the length of the string is exactly 54 characters
    if len(cube_faces) != 54:
        return False, "Invalid cube string length! Expected 54 characters."
    
    # Count occurrences of each character in the string
    counts = Counter(cube_faces)

    # List of valid colors representing each face of the Rubik's Cube
    valid_colors = ['W', 'G', 'R', 'B', 'O', 'Y']
    
    # Check if each color appears exactly 9 times
    for color in valid_colors:
        if counts[color] != 9:
            return False, f"Invalid color count for {color}: {counts[color]} (expected 9)"

    # Split into faces
    faces = [cube_faces[i:i+9] for i in range(0, 54, 9)]
    
    # Get center color of each face
    centers = [face[4] for face in faces]
    
    if len(set(centers)) != 6:
        return False, "Invalid cube configuration! Each face center must be unique."

    # Create a mapping of current positions to desired positions
    color_to_position = {
        'W': 0,  # White face first
        'G': 1,  # Green face second
        'R': 2,  # Red face third
        'B': 3,  # Blue face fourth
        'O': 4,  # Orange face fifth
        'Y': 5   # Yellow face last
    }

    # Sort faces based on center colors
    sorted_faces = [''] * 6
    for i, face in enumerate(faces):
        center_color = face[4]
        correct_position = color_to_position[center_color]
        sorted_faces[correct_position] = face

    # Join all faces back together into a 54-character string
    sorted_cube_string = ''.join([''.join(face) for face in sorted_faces])
    
    return True, sorted_cube_string

@csrf_exempt
def verify(request):
    global cube_state, current_face
    # print("Verify endpoint called!")  # Debug print
    # print(f"Current face: {current_face}")  # Debug print
    # print(f"Current cube state: {cube_state}")  # Debug print
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            colors = data.get('colors', [])
            
            if len(colors) != 9:
                return JsonResponse({
                    'success': False,
                    'message': 'Need exactly 9 colors!'
                }, status=400)
            
            # Initialize cube_state if empty
            if not cube_state:
                cube_state = [[] for _ in range(6)]
            
            # Check if this face has already been stored
            for stored_face in cube_state:
                if stored_face and stored_face == colors:  # Direct list comparison
                    return JsonResponse({
                        'success': False,
                        'isDuplicate': True,
                        'message': 'This face has already been scanned!'
                    })
            
            # Store colors for current face
            cube_state[current_face] = colors
            current_face += 1
            
            if current_face < 6:
                return JsonResponse({
                    'success': True,
                    'message': f'Face {current_face} stored! {6 - current_face} faces remaining.',
                    'facesRemaining': 6 - current_face
                })
            else:
                # All faces completed
                complete_state = cube_state.copy()
                # Convert complete_state to a single string
                cube_string = ''.join([''.join(face) for face in complete_state])
                
                # Validate the cube state
                is_valid, result = check_validity(cube_string)
                if is_valid:
                    # result now contains the sorted cube string
                    cube_string = result
                    print(cube_string)
                else:
                    message = result  # If invalid, result contains error message

                # Reset for next scan
                cube_state = []
                current_face = 0
                
                return JsonResponse({
                    'success': True,
                    'message': 'Cube state is valid' if is_valid else message,
                    'isValid': is_valid,
                    'complete_state': cube_string if is_valid else None,
                    'facesRemaining': 0,
                    'cube_string': cube_string if is_valid else None
                })
                
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error processing request: {str(e)}'
            }, status=400)
    
    return JsonResponse({
        'success': False,
        'message': 'Only POST requests are allowed'
    }, status=400)

@csrf_exempt
def reset(request):
    global cube_state, current_face
    # print("Reset endpoint called!")  # Debug print
    # print(f"Previous state: {cube_state}")  # Debug print
    cube_state = []
    current_face = 0
    # print("State after reset:", cube_state)  # Debug print
    return JsonResponse({'success': True, 'message': 'Cube state reset successfully'})

