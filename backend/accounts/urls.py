from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .management_views import (
    AdminUserActivateView,
    AdminUserApproveView,
    AdminUserDeactivateView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserRejectView,
)
from .password_reset import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
)
from .registration_views import RegisterView
from .views import (
    CurrentUserView,
    CustomTokenObtainPairView,
    LogoutView,
    PasswordChangeView,
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
    path(
    "password/change/",
    PasswordChangeView.as_view(),
    name="password-change",
    ),
    path(
        "password/reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path(
        "users/",
        AdminUserListView.as_view(),
        name="admin-user-list",
    ),
    path(
        "users/<int:pk>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail",
    ),
    path(
        "users/<int:pk>/approve/",
        AdminUserApproveView.as_view(),
        name="admin-user-approve",
    ),
    path(
        "users/<int:pk>/reject/",
        AdminUserRejectView.as_view(),
        name="admin-user-reject",
    ),
    path(
        "users/<int:pk>/activate/",
        AdminUserActivateView.as_view(),
        name="admin-user-activate",
    ),
    path(
        "users/<int:pk>/deactivate/",
        AdminUserDeactivateView.as_view(),
        name="admin-user-deactivate",
    ),
]
