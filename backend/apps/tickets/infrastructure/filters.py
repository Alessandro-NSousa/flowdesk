import django_filters
from apps.tickets.infrastructure.models import Ticket


class TicketFilter(django_filters.FilterSet):
    """RF24 – Filtros por status, setor, protocolo e data."""
    status = django_filters.UUIDFilter(field_name="status__id")
    requesting_sector = django_filters.UUIDFilter(field_name="requesting_sector__id")
    responsible_sector = django_filters.UUIDFilter(field_name="responsible_sector__id")
    protocol = django_filters.CharFilter(field_name="protocol", lookup_expr="icontains")
    # DateFilter aceita YYYY-MM-DD e compara só a parte de data, evitando
    # o problema de DateTimeFilter interpretar "2024-03-30" como meia-noite
    # e perder todos os tickets criados durante o dia no filtro "até".
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Ticket
        fields = [
            "status",
            "requesting_sector",
            "responsible_sector",
            "protocol",
            "created_after",
            "created_before",
        ]
