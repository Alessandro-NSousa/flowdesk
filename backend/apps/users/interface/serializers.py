from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.infrastructure.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "is_admin", "is_active", "must_change_password", "can_assign_tickets", "created_at"]
        read_only_fields = ["id", "is_active", "must_change_password", "created_at"]


class CreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    is_admin = serializers.BooleanField(default=False)
    can_assign_tickets = serializers.BooleanField(default=False)
    sector_id = serializers.UUIDField(required=False, allow_null=True)


class UpdateUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    email = serializers.EmailField(required=False)
    is_admin = serializers.BooleanField(required=False)
    can_assign_tickets = serializers.BooleanField(required=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(min_length=8, write_only=True)


class FlowDeskTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["is_admin"] = user.is_admin
        token["must_change_password"] = user.must_change_password
        token["can_assign_tickets"] = user.can_assign_tickets
        return token
