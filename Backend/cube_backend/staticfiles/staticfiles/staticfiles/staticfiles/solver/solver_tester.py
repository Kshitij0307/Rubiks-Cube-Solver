from cube_backend.scanner.helper_methods import solve_cube

# cube = 'OOYOWRGGRWBBWBOYYGWRBWRBGGORYBRYBWOOBGRWGROYYRWWBOGYYG'
cube_faces = [
    ['Y', 'O', 'Y', 'R', 'W', 'B', 'O', 'W', 'R'],  # Up (White)
    ['W', 'R', 'W', 'G', 'G', 'B', 'B', 'R', 'G'],  # Front (Green)
    ['G', 'O', 'R', 'Y', 'R', 'W', 'Y', 'W', 'R'],  # Right (Red)
    ['G', 'Y', 'O', 'B', 'B', 'Y', 'W', 'R', 'B'],  # Back (Blue)
    ['B', 'G', 'G', 'G', 'O', 'O', 'W', 'W', 'R'],  # Left (Orange)
    ['Y', 'B', 'O', 'O', 'Y', 'G', 'O', 'Y', 'B'],  # Down (Yellow)
]

result,msg,move_count,move_string = solve_cube(cube_faces)
print(result)
print(msg) 
print(move_count)
print(move_string)
