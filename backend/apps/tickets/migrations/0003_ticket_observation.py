import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0002_default_statuses"),
        ("users", "0002_user_must_change_password"),
    ]

    operations = [
        migrations.CreateModel(
            name="TicketObservation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField(verbose_name="Observação")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("ticket", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="observations",
                    to="tickets.ticket",
                    verbose_name="Chamado",
                )),
                ("created_by", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="ticket_observations",
                    to="users.user",
                    verbose_name="Criado por",
                )),
            ],
            options={
                "db_table": "ticket_observations",
                "verbose_name": "Observação de chamado",
                "verbose_name_plural": "Observações de chamados",
                "ordering": ["created_at"],
            },
        ),
    ]
