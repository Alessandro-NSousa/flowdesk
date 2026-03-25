import uuid
from django.db import models


class TicketStatus(models.Model):
    """RF18, RF19, RF20 – Status de chamados, configuráveis por setor."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nome")
    sector = models.ForeignKey(
        "sectors.Sector",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="custom_statuses",
        verbose_name="Setor",
        help_text="Nulo = status global; preenchido = status exclusivo do setor.",
    )
    is_default = models.BooleanField(
        default=False,
        verbose_name="Padrão",
        help_text="Indica se é um dos status padrão do sistema.",
    )
    order = models.PositiveSmallIntegerField(default=0, verbose_name="Ordem")

    class Meta:
        db_table = "ticket_statuses"
        verbose_name = "Status de chamado"
        verbose_name_plural = "Status de chamados"
        ordering = ["order", "name"]
        unique_together = [("name", "sector")]

    def __str__(self) -> str:
        suffix = f" [{self.sector}]" if self.sector else " [global]"
        return f"{self.name}{suffix}"


class Ticket(models.Model):
    """RF13–RF17 – Chamados internos entre setores."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Título")
    description = models.TextField(verbose_name="Descrição")
    requesting_sector = models.ForeignKey(
        "sectors.Sector",
        on_delete=models.PROTECT,
        related_name="requested_tickets",
        verbose_name="Setor solicitante",
    )
    responsible_sector = models.ForeignKey(
        "sectors.Sector",
        on_delete=models.PROTECT,
        related_name="responsible_tickets",
        verbose_name="Setor responsável",
    )
    status = models.ForeignKey(
        TicketStatus,
        on_delete=models.PROTECT,
        related_name="tickets",
        verbose_name="Status",
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="created_tickets",
        verbose_name="Criado por",
    )
    updated_by = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_tickets",
        verbose_name="Atualizado por",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        db_table = "tickets"
        verbose_name = "Chamado"
        verbose_name_plural = "Chamados"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"#{str(self.id)[:8]} – {self.title}"


class TicketObservation(models.Model):
    """Observação obrigatória ao concluir um chamado."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="observations",
        verbose_name="Chamado",
    )
    content = models.TextField(verbose_name="Observação")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="ticket_observations",
        verbose_name="Criado por",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")

    class Meta:
        db_table = "ticket_observations"
        verbose_name = "Observação de chamado"
        verbose_name_plural = "Observações de chamados"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Observação – {self.ticket}"
