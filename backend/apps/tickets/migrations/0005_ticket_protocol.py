import secrets
from django.db import migrations, models


_PROTOCOL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ123456789"
_PROTOCOL_LENGTH = 8


def _generate_protocol():
    return "".join(secrets.choice(_PROTOCOL_ALPHABET) for _ in range(_PROTOCOL_LENGTH))


def populate_protocols(apps, schema_editor):
    Ticket = apps.get_model("tickets", "Ticket")
    used = set()
    for ticket in Ticket.objects.all():
        protocol = _generate_protocol()
        while protocol in used:
            protocol = _generate_protocol()
        used.add(protocol)
        ticket.protocol = protocol
        ticket.save(update_fields=["protocol"])


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0004_ticket_assigned_to"),
    ]

    operations = [
        # Passo 1: adicionar como nullable para compatibilidade com dados existentes
        migrations.AddField(
            model_name="ticket",
            name="protocol",
            field=models.CharField(
                blank=True,
                null=True,
                max_length=16,
                verbose_name="Protocolo",
                help_text="Código de identificação único do chamado.",
            ),
        ),
        # Passo 2: popular registros existentes com protocolos únicos
        migrations.RunPython(populate_protocols, migrations.RunPython.noop),
        # Passo 3: tornar único e obrigatório
        migrations.AlterField(
            model_name="ticket",
            name="protocol",
            field=models.CharField(
                max_length=16,
                unique=True,
                editable=False,
                verbose_name="Protocolo",
                help_text="Código de identificação único do chamado.",
            ),
        ),
    ]
