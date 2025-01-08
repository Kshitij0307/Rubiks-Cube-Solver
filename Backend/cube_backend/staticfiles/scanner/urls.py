from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('capture/', views.capture, name='capture'),
    path('verify/', views.verify, name='verify'),
    path('reset/', views.reset, name='reset'),
]

