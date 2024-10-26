import numpy as np

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