"""
Application use-cases for the Users bounded context.
"""
import secrets
import string
import uuid
from datetime import datetime, timezone

from django.conf import settings
from django.core.mail import send_mail

from apps.users.infrastructure.models import User


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class CreateUserUseCase:
    """Admin cria membro: gera senha temporária, envia por e-mail e exige troca no 1º acesso."""

    def execute(
        self,
        email: str,
        first_name: str,
        last_name: str,
        is_admin: bool = False,
        can_assign_tickets: bool = False,
        sector_id: str | None = None,
    ) -> User:
        if User.objects.filter(email=email).exists():
            raise ValueError("Já existe um usuário com esse e-mail.")

        temp_password = _generate_temp_password()

        user = User.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=temp_password,
            is_admin=is_admin,
            can_assign_tickets=can_assign_tickets,
            is_active=True,
            must_change_password=True,
        )

        if sector_id:
            from apps.sectors.infrastructure.models import Sector
            try:
                sector = Sector.objects.get(pk=sector_id)
                sector.members.add(user)
            except Sector.DoesNotExist:
                pass

        _send_welcome_email(user, temp_password)
        return user


def _send_welcome_email(user: User, temp_password: str) -> None:
    send_mail(
        subject="Bem-vindo ao FlowDesk – Acesse sua conta",
        message=(
            f"Olá {user.full_name},\n\n"
            f"Sua conta no FlowDesk foi criada.\n\n"
            f"E-mail: {user.email}\n"
            f"Senha temporária: {temp_password}\n\n"
            f"Acesse o sistema em: {settings.FRONTEND_URL}\n"
            f"Na primeira vez que entrar, você deverá definir uma senha pessoal.\n\n"
            "Este e-mail é gerado automaticamente, não responda."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


class ChangePasswordUseCase:
    """Usuário troca sua própria senha (obrigatório no 1º acesso)."""

    def execute(self, user: User, current_password: str, new_password: str) -> User:
        if not user.check_password(current_password):
            raise ValueError("Senha atual incorreta.")
        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        return user


class UpdateUserUseCase:
    """Admin atualiza dados de um usuário (nome, e-mail, permissão)."""

    def execute(self, user_id: str, **fields) -> User:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValueError("Usuário não encontrado.")
        for field, value in fields.items():
            setattr(user, field, value)
        user.save()
        return user


class DeleteUserUseCase:
    """Admin remove um usuário. Não permite auto-exclusão."""

    def execute(self, user_id: str, requesting_user_id: str) -> None:
        if str(user_id) == str(requesting_user_id):
            raise ValueError("Você não pode excluir a si mesmo.")
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValueError("Usuário não encontrado.")
        user.delete()


class AcceptInviteUseCase:
    """Mantido para compatibilidade com tokens legados já enviados."""

    def execute(self, token: str, password: str, first_name: str, last_name: str) -> User:
        try:
            user = User.objects.get(invite_token=token, is_active=False)
        except User.DoesNotExist:
            raise ValueError("Token de convite inválido ou já utilizado.")
        user.first_name = first_name
        user.last_name = last_name
        user.set_password(password)
        user.is_active = True
        user.invite_token = None
        user.save()
        return user


class PasswordResetRequestUseCase:
    """RF05 – Solicita recuperação de senha."""

    def execute(self, email: str) -> None:
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return
        token = uuid.uuid4()
        user.invite_token = token
        user.invite_sent_at = datetime.now(tz=timezone.utc)
        user.save(update_fields=["invite_token", "invite_sent_at"])
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password/{token}"
        send_mail(
            subject="FlowDesk – Recuperação de senha",
            message=(
                f"Olá {user.full_name},\n\n"
                f"Para redefinir sua senha acesse:\n{reset_url}\n\n"
                "Se você não solicitou isso, ignore esta mensagem."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


class PasswordResetConfirmUseCase:
    """RF05 – Confirma nova senha após token de recuperação."""

    def execute(self, token: str, new_password: str) -> User:
        try:
            user = User.objects.get(invite_token=token, is_active=True)
        except User.DoesNotExist:
            raise ValueError("Token de recuperação inválido ou expirado.")
        user.set_password(new_password)
        user.invite_token = None
        user.save(update_fields=["password", "invite_token"])
        return user

