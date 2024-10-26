from collections import Counter
import twophase.solver  as sv
import cv2 as cv

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

def draw_contours(sticker_frame, detected_colors):
    pos = 0
    for color in detected_colors:
        x, y, w, h = color[1], color[2], color[3], color[4]
        cv.putText(sticker_frame, f"{pos}", (x + int(0.5 * w), y + int(0.5 * h)), cv.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2, cv.LINE_AA)
        pos += 1

def store_face(cube_faces,detected_colors,facecount):
    pos = 0
    for color in detected_colors:
        cube_faces[facecount][pos] = color[0]
        pos += 1

    return facecount+1

def convert_cube_format(cube_faces):
    # Create a mapping from original colors to new colors
    color_map = {
        'W': 'U',  # White to Up
        'G': 'F',  # Green to Right
        'R': 'R',  # Red to Front
        'Y': 'D',  # Yellow to Down
        'B': 'B',  # Blue to Left
        'O': 'L'   # Orange to Back
    }

    # Assuming each face is a list of 9 elements where the center color is at index 4
    face_order = ['W', 'R', 'G', 'Y', 'O', 'B']

    # Create an empty dictionary to map each center color to its target index
    center_to_index = {}

    # Loop through the face_order list and add each color with its index to center_to_index
    for i, color in enumerate(face_order):
        center_to_index[color] = i

    # Create a new list to store the sorted faces
    sorted_faces = []

    # Sort cube_faces based on the center color in the middle (index 4) of each face
    # We use center_to_index to find the correct order based on the center color
    for face in sorted(cube_faces, key=lambda face: center_to_index[face[4]]):
        sorted_faces.append(face)  # Add each sorted face to the new list

    # Then proceed with flattening or other operations
    flattened_faces = [color for face in sorted_faces for color in face]
    converted_format = ''.join(color_map[color] for color in flattened_faces)

    return converted_format

def convert_sol_format(sol):
    # Split the string by spaces and store in an array
    moves_array = sol.split()

    # Create a new list to store the transformed moves
    transformed_moves = []

    for move in moves_array[:-1]:  # Exclude the last element
        if move[-1] == '3':
            transformed_moves.append(move[:-1] + "'")  # Change 'D3' to 'D''
        elif move[-1] == '1':
            transformed_moves.append(move[:-1])  # Change 'D1' to 'D'
        else:
            transformed_moves.append(move)
    
    # Change the last element to an integer containing only the move count
    move_count_str = moves_array[-1].strip('()f')  # Remove parentheses and 'f'
    move_count = int(move_count_str)  # Convert to integer

    # Append the move count to the transformed moves list
    transformed_moves.append(move_count)
    return transformed_moves

def check_validity(cube_faces):
    # Check if the length of the string is exactly 54 characters
    if len(cube_faces) != 54:
        return False, "Invalid cube string length! Expected 54 characters."
    
    # Count occurrences of each character in the string
    counts = Counter(cube_faces)

    # List of valid colors representing each face of the Rubik's Cube
    valid_colors = ['U', 'R', 'F', 'D', 'L', 'B']
    
    # Check if each color appears exactly 9 times
    for color in valid_colors:
        if counts[color] != 9:
            return False, f"Invalid color count for {color}: {counts[color]} (expected 9)"

    # Check that each face center is unique
    centers = [cube_faces[4], cube_faces[13], cube_faces[22], cube_faces[31], cube_faces[40], cube_faces[49]]
    if len(set(centers)) != 6:
        return False, "Invalid cube configuration! Each face center must be unique."

    # If all conditions are met, return True with a success message
    return True, "Cube string is valid."

def solve_cube(cube_faces):
    cube_faces = convert_cube_format(cube_faces)
    result, msg = check_validity(cube_faces)

    if(result):
        sol = sv.solve(cube_faces,20,2)
        sol = convert_sol_format(sol)
        move_string = ' '.join(sol[:-1])  # Exclude the last element for the moves
        move_count = sol[-1]  # Get the last element (move count)

        return result,msg,move_count,move_string
        # # Print statement indicating the cube is solved
        # print()
        # print(f'Cube solved in {move_count} moves:')
        # print(move_string)
    else:
        return result,msg,-1,""

# Testing
# string = 'OOYOWRGGRWBBWBOYYGWRBWRBGGORYBRYBWOOBGRWGROYYRWWBOGYYG'
# solve_cube(string)

# string = 'GWGOWOBWBOGRWRWOBRYGYOGRWGWBYBRYRGYGOBRYOYOGRWBWOBRYBY'
# solve_cube(string)

# WEBSITE STRING WBGGYYWRWOOOWGOBBOGGBRROGRWRYRWWYBYBRWOOBWRBYYRGBOGYGY
# MY STRING SMALL GWGOWOBWBOGRWRWOBRYGYOGRWGWBYBRYRGYGOBRYOYOGRWBWOBRYBY



# string = "GWGOWOBWBOGRWRWOBRYGYOGRWGWBYBRYRGYGOBRYOYOGRWBWOBRYBY"
# cube_faces = [list(string[i:i+9]) for i in range(0, len(string), 9)]
# res,msg,move,moves = solve_cube(cube_faces)
# print_cube(cube_faces)
# print(res)
# print(msg)
# print(move)
# print(moves)

