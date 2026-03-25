from rest_framework import serializers

from apps.sectors.interface.serializers import SectorSerializer
from apps.tickets.infrastructure.models import Ticket, TicketObservation, TicketStatus
from apps.users.interface.serializers import UserSerializer


class TicketStatusSerializer(serializers.ModelSerializer):
    sector = SectorSerializer(read_only=True)

    class Meta:
        model = TicketStatus
        fields = ["id", "name", "sector", "is_default", "order"]
        read_only_fields = ["id", "is_default"]


class TicketStatusWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    sector_id = serializers.UUIDField()
    order = serializers.IntegerField(default=99)


class TicketObservationSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketObservation
        fields = ["id", "content", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    status = TicketStatusSerializer(read_only=True)
    requesting_sector = SectorSerializer(read_only=True)
    responsible_sector = SectorSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    observations = TicketObservationSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description",
            "requesting_sector", "responsible_sector",
            "status", "created_by", "updated_by",
            "created_at", "updated_at", "observations",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    requesting_sector_id = serializers.UUIDField()
    responsible_sector_id = serializers.UUIDField()


class TicketUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False)
    status_id = serializers.UUIDField(required=False)
    observation = serializers.CharField(required=False, allow_blank=False)
