from __future__ import annotations

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Suggestion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("path", models.CharField(max_length=512)),
                ("score", models.FloatField(default=0)),
                ("source", models.CharField(choices=[("uploaded", "Uploaded"), ("external", "External")], default="uploaded", max_length=32)),
                ("meta", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
        ),
    ]
