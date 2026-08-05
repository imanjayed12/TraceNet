from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditLog
from audit.services import record_audit_event

from .management_serializers import (
    AdminUserSerializer,
    AdminUserUpdateSerializer,
)
from .permissions import CanManageUsers


User = get_user_model()


def record_user_management_event(
    *,
    request,
    target,
    action,
    label,
    previous_state,
):
    record_audit_event(
        action=action,
        request=request,
        actor=request.user,
        actor_email=request.user.email,
        resource_type="user",
        resource_id=target.pk,
        resource_label=label,
        status_code=status.HTTP_200_OK,
        success=True,
        metadata={
            "target_email": target.email,
            "previous_role": previous_state["role"],
            "new_role": target.role,
            "previous_access_status": (
                previous_state["access_status"]
            ),
            "new_access_status": target.access_status,
            "previous_is_active": (
                previous_state["is_active"]
            ),
            "new_is_active": target.is_active,
        },
    )


def get_user_state(user):
    return {
        "role": user.role,
        "access_status": user.access_status,
        "is_active": user.is_active,
    }


class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = (CanManageUsers,)

    def get_queryset(self):
        queryset = User.objects.all()

        role = self.request.query_params.get(
            "role",
        )
        access_status = self.request.query_params.get(
            "access_status",
        )
        is_active = self.request.query_params.get(
            "is_active",
        )
        search = self.request.query_params.get(
            "search",
        )

        if role:
            queryset = queryset.filter(
                role__iexact=role.strip(),
            )

        if access_status:
            queryset = queryset.filter(
                access_status__iexact=(
                    access_status.strip()
                ),
            )

        if is_active in {"true", "false"}:
            queryset = queryset.filter(
                is_active=is_active == "true",
            )

        if search:
            search = search.strip()

            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(full_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(organization__icontains=search)
            )

        return queryset.order_by(
            "-date_joined",
            "-id",
        )


class AdminUserDetailView(APIView):
    permission_classes = (CanManageUsers,)

    def get_object(self, pk):
        return get_object_or_404(
            User.objects.all(),
            pk=pk,
        )

    def get(self, request, pk):
        user = self.get_object(pk)

        return Response(
            AdminUserSerializer(user).data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def patch(self, request, pk):
        user = get_object_or_404(
            User.objects.select_for_update(),
            pk=pk,
        )
        previous_state = get_user_state(user)

        serializer = AdminUserUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )
        serializer.is_valid(
            raise_exception=True,
        )
        serializer.save()

        user.refresh_from_db()

        record_user_management_event(
            request=request,
            target=user,
            action=AuditLog.Action.UPDATE,
            label="User account updated",
            previous_state=previous_state,
        )

        return Response(
            AdminUserSerializer(user).data,
            status=status.HTTP_200_OK,
        )


class AdminUserApproveView(APIView):
    permission_classes = (CanManageUsers,)

    @transaction.atomic
    def post(self, request, pk):
        user = get_object_or_404(
            User.objects.select_for_update(),
            pk=pk,
        )
        previous_state = get_user_state(user)

        serializer = AdminUserUpdateSerializer(
            user,
            data={
                "access_status": (
                    User.AccessStatus.APPROVED
                ),
                "is_active": True,
            },
            partial=True,
            context={
                "request": request,
            },
        )
        serializer.is_valid(
            raise_exception=True,
        )
        serializer.save()

        user.refresh_from_db()

        record_user_management_event(
            request=request,
            target=user,
            action=AuditLog.Action.APPROVE_USER,
            label="User account approved",
            previous_state=previous_state,
        )

        return Response(
            {
                "detail": (
                    "User account approved successfully."
                ),
                "user": AdminUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminUserRejectView(APIView):
    permission_classes = (CanManageUsers,)

    @transaction.atomic
    def post(self, request, pk):
        user = get_object_or_404(
            User.objects.select_for_update(),
            pk=pk,
        )
        previous_state = get_user_state(user)

        serializer = AdminUserUpdateSerializer(
            user,
            data={
                "access_status": (
                    User.AccessStatus.REJECTED
                ),
                "is_active": False,
            },
            partial=True,
            context={
                "request": request,
            },
        )
        serializer.is_valid(
            raise_exception=True,
        )
        serializer.save()

        user.refresh_from_db()

        record_user_management_event(
            request=request,
            target=user,
            action=AuditLog.Action.REJECT_USER,
            label="User account rejected",
            previous_state=previous_state,
        )

        return Response(
            {
                "detail": (
                    "User account rejected successfully."
                ),
                "user": AdminUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminUserActivateView(APIView):
    permission_classes = (CanManageUsers,)

    @transaction.atomic
    def post(self, request, pk):
        user = get_object_or_404(
            User.objects.select_for_update(),
            pk=pk,
        )

        if (
            user.access_status
            != User.AccessStatus.APPROVED
        ):
            return Response(
                {
                    "detail": (
                        "Only an approved account can be "
                        "activated."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_state = get_user_state(user)

        serializer = AdminUserUpdateSerializer(
            user,
            data={
                "is_active": True,
            },
            partial=True,
            context={
                "request": request,
            },
        )
        serializer.is_valid(
            raise_exception=True,
        )
        serializer.save()

        user.refresh_from_db()

        record_user_management_event(
            request=request,
            target=user,
            action=AuditLog.Action.UPDATE,
            label="User account activated",
            previous_state=previous_state,
        )

        return Response(
            {
                "detail": (
                    "User account activated successfully."
                ),
                "user": AdminUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminUserDeactivateView(APIView):
    permission_classes = (CanManageUsers,)

    @transaction.atomic
    def post(self, request, pk):
        user = get_object_or_404(
            User.objects.select_for_update(),
            pk=pk,
        )
        previous_state = get_user_state(user)

        serializer = AdminUserUpdateSerializer(
            user,
            data={
                "is_active": False,
            },
            partial=True,
            context={
                "request": request,
            },
        )
        serializer.is_valid(
            raise_exception=True,
        )
        serializer.save()

        user.refresh_from_db()

        record_user_management_event(
            request=request,
            target=user,
            action=AuditLog.Action.UPDATE,
            label="User account deactivated",
            previous_state=previous_state,
        )

        return Response(
            {
                "detail": (
                    "User account deactivated successfully."
                ),
                "user": AdminUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )