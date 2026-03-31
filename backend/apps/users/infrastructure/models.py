import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_admin", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name="E-mail")
    first_name = models.CharField(max_length=100, verbose_name="Nome")
    last_name = models.CharField(max_length=100, verbose_name="Sobrenome")
    is_active = models.BooleanField(
        default=False,
        verbose_name="Ativo",
        help_text="Usuário permanece inativo até concluir cadastro via convite.",
    )
    is_staff = models.BooleanField(default=False, verbose_name="Staff")
    is_admin = models.BooleanField(default=False, verbose_name="Administrador")
    must_change_password = models.BooleanField(
        default=False,
        verbose_name="Deve trocar a senha",
        help_text="Quando True, o usuário é forçado a definir uma senha pessoal no próximo acesso.",
    )
    can_assign_tickets = models.BooleanField(
        default=False,
        verbose_name="Pode atribuir chamados",
        help_text="Quando True, o usuário pode reatribuir chamados abertos para outros membros do setor.",
    )
    invite_token = models.UUIDField(null=True, blank=True, unique=True, verbose_name="Token de convite")
    invite_sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Convite enviado em")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["first_name", "last_name"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} <{self.email}>"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
