from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .registration_views import RegisterView
from .views import (
    CurrentUserView,
    CustomTokenObtainPairView,
    LogoutView,
)


app_name = "accounts"

urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "login/",
        CustomTokenObtainPairView.as_view(),
        name="login",
    ),
    path(
        "refresh/",
        TokenRefreshView.as_view(),
        name="refresh",
    ),
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),
    path(
        "me/",
        CurrentUserView.as_view(),
        name="current-user",
    ),
]