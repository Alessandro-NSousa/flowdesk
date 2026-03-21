from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.application.use_cases import (
    AcceptInviteUseCase,
    ChangePasswordUseCase,
    CreateUserUseCase,
    DeleteUserUseCase,
    PasswordResetConfirmUseCase,
    PasswordResetRequestUseCase,
    UpdateUserUseCase,
)
from apps.users.infrastructure.models import User
from apps.users.interface.permissions import IsAdminUser
from apps.users.interface.serializers import (
    AcceptInviteSerializer,
    ChangePasswordSerializer,
    CreateUserSerializer,
    FlowDeskTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UpdateUserSerializer,
    UserSerializer,
)


class FlowDeskTokenObtainPairView(TokenObtainPairView):
    """RF04 – Autenticação via JWT."""
    serializer_class = FlowDeskTokenObtainPairSerializer


class UserListCreateView(generics.ListCreateAPIView):
    """Admin lista e cria usuários diretamente."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by("first_name", "last_name")
        if self.request.query_params.get("available") == "true":
            qs = qs.filter(sectors__isnull=True)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = CreateUserUseCase().execute(**serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    """Admin consulta, atualiza e remove um usuário."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UpdateUserSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            updated = UpdateUserUseCase().execute(user_id=str(pk), **serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserSerializer(updated).data)

    def delete(self, request, pk):
        try:
            DeleteUserUseCase().execute(
                user_id=str(pk),
                requesting_user_id=str(request.user.id),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AcceptInviteView(APIView):
    """Compatibilidade com tokens de convite legados."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = AcceptInviteUseCase().execute(**serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """RF05 – Solicita recuperação de senha."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        PasswordResetRequestUseCase().execute(serializer.validated_data["email"])
        return Response(
            {"detail": "Se o e-mail existir, você receberá um link de recuperação."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """RF05 – Confirma nova senha."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            PasswordResetConfirmUseCase().execute(**serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Usuário troca a própria senha (obrigatório no 1º acesso)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ChangePasswordUseCase().execute(
                user=request.user,
                **serializer.validated_data,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Senha alterada com sucesso."}, status=status.HTTP_200_OK)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Retorna e atualiza o usuário autenticado."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
