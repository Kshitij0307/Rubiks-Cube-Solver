from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from scanner.helper_methods import solve_cube



# Create your views here.
@api_view(['Post'])
def solve(req):
    cube_state = req.data.get("cube_state")
    result,msg,move_count,move_string = solve_cube(cube_state)
    status = 'Solved' if result else 'Not Solvable'

    data = {
        "status": status,
        "message": msg,
        "no_of_moves":move_count,
        "moves":move_string,
    }
    return Response(data)
