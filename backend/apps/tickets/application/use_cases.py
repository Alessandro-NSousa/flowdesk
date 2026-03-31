"""
Application use-cases for the Tickets bounded context.
"""
from apps.sectors.infrastructure.models import Sector
from apps.tickets.infrastructure.models import Ticket, TicketObservation, TicketStatus
from apps.users.infrastructure.models import User

_UNSET = object()  # sentinel para distinguir "não enviado" de None


class CreateDefaultStatusesUseCase:
    """RF18 – Cria os três status padrão do sistema se ainda não existirem."""

    DEFAULT_STATUSES = [
        ("Pendente", 0),
        ("Em Aberto", 1),
        ("Concluído", 2),
    ]

    def execute(self) -> None:
        for name, order in self.DEFAULT_STATUSES:
            TicketStatus.objects.get_or_create(
                name=name,
                sector=None,
                defaults={"is_default": True, "order": order},
            )


class CreateCustomStatusUseCase:
    """RF19 – Cadastro de novo status por setor."""

    def execute(self, name: str, sector_id: str, order: int = 99) -> TicketStatus:
        sector = Sector.objects.get(pk=sector_id)
        if TicketStatus.objects.filter(name=name, sector=sector).exists():
            raise ValueError(f"O setor '{sector.name}' já possui um status com o nome '{name}'.")
        return TicketStatus.objects.create(name=name, sector=sector, order=order)


class CreateTicketUseCase:
    """RF13 – Qualquer setor pode abrir chamado para outro setor."""

    def execute(
        self,
        title: str,
        description: str,
        requesting_sector_id: str,
        responsible_sector_id: str,
        created_by: User,
        assigned_to_id: str | None = None,
    ) -> Ticket:
        requesting_sector = Sector.objects.get(pk=requesting_sector_id)
        responsible_sector = Sector.objects.get(pk=responsible_sector_id)

        # RF09 – Usuário precisa ser membro do setor solicitante
        if not created_by.is_admin and not requesting_sector.members.filter(pk=created_by.pk).exists():
            raise PermissionError("Você não é membro do setor solicitante.")

        assigned_to = None
        if assigned_to_id:
            assigned_to = User.objects.get(pk=assigned_to_id)
            if not responsible_sector.members.filter(pk=assigned_to.pk).exists():
                raise ValueError("O usuário atribuído não é membro do setor responsável.")

        default_status = TicketStatus.objects.filter(name="Pendente", sector=None).first()
        if not default_status:
            CreateDefaultStatusesUseCase().execute()
            default_status = TicketStatus.objects.get(name="Pendente", sector=None)

        ticket = Ticket.objects.create(
            title=title,
            description=description,
            requesting_sector=requesting_sector,
            responsible_sector=responsible_sector,
            status=default_status,
            created_by=created_by,
            assigned_to=assigned_to,
        )

        # RF21 – Notificação assíncrona: despacha em thread daemon para não
        # bloquear o request caso o broker (Redis) esteja indisponível.
        import threading

        def _dispatch():
            try:
                from apps.tickets.application.tasks import notify_sector_new_ticket
                notify_sector_new_ticket.delay(str(ticket.id))
            except Exception:
                pass

        threading.Thread(target=_dispatch, daemon=True).start()

        return ticket


class UpdateTicketUseCase:
    """RF15 – Apenas setor responsável pode atualizar o chamado."""

    DONE_STATUS_NAME = "Concluído"

    def execute(
        self,
        ticket_id: str,
        requesting_user: User,
        status_id: str | None = None,
        title: str | None = None,
        description: str | None = None,
        assigned_to_id=_UNSET,
        observation: str | None = None,
    ) -> Ticket:
        ticket = Ticket.objects.select_related("responsible_sector", "status").get(pk=ticket_id)

        # Chamados concluídos são imutáveis
        if ticket.status.name == self.DONE_STATUS_NAME:
            raise ValueError("Chamados concluídos não podem ser alterados.")

        # Admin pode sempre; usuário comum precisa ser do setor responsável
        if not requesting_user.is_admin:
            if not ticket.responsible_sector.members.filter(pk=requesting_user.pk).exists():
                raise PermissionError("Apenas membros do setor responsável podem atualizar o chamado.")

        if title is not None:
            ticket.title = title
        if description is not None:
            ticket.description = description

        if assigned_to_id is not _UNSET:
            if assigned_to_id is None:
                ticket.assigned_to = None
            else:
                if str(assigned_to_id) != str(requesting_user.pk):
                    if not requesting_user.is_admin and not requesting_user.can_assign_tickets:
                        raise PermissionError("Você não tem permissão para atribuir chamados a outros membros.")
                assigned_user = User.objects.get(pk=assigned_to_id)
                if not ticket.responsible_sector.members.filter(pk=assigned_user.pk).exists():
                    raise ValueError("O usuário atribuído não é membro do setor responsável.")
                ticket.assigned_to = assigned_user

        if status_id is not None:
            new_status = TicketStatus.objects.get(pk=status_id)
            if new_status.name == self.DONE_STATUS_NAME:
                if not observation or not observation.strip():
                    raise ValueError("É obrigatório adicionar uma observação ao concluir o chamado.")
                ticket.status = new_status
                ticket.updated_by = requesting_user
                ticket.save()
                TicketObservation.objects.create(
                    ticket=ticket,
                    content=observation.strip(),
                    created_by=requesting_user,
                )
                return ticket
            ticket.status = new_status

        ticket.updated_by = requesting_user
        ticket.save()
        return ticket


class AssignTicketUseCase:
    """Assume um chamado sem atribuição ou reatribui para outro membro do setor."""

    DONE_STATUS_NAME = "Concluído"

    def execute(self, ticket_id: str, requesting_user: User, target_user_id: str | None = None) -> Ticket:
        ticket = Ticket.objects.select_related("responsible_sector", "status").get(pk=ticket_id)

        if ticket.status.name == self.DONE_STATUS_NAME:
            raise ValueError("Chamados concluídos não podem ser alterados.")

        if not requesting_user.is_admin:
            if not ticket.responsible_sector.members.filter(pk=requesting_user.pk).exists():
                raise PermissionError("Apenas membros do setor responsável podem assumir o chamado.")

        if target_user_id and str(target_user_id) != str(requesting_user.pk):
            if not requesting_user.is_admin and not requesting_user.can_assign_tickets:
                raise PermissionError("Você não tem permissão para atribuir chamados a outros membros.")
            assigned = User.objects.get(pk=target_user_id)
            if not ticket.responsible_sector.members.filter(pk=assigned.pk).exists():
                raise ValueError("O usuário alvo não é membro do setor responsável.")
        else:
            assigned = requesting_user

        ticket.assigned_to = assigned
        ticket.updated_by = requesting_user
        ticket.save()
        return ticket
