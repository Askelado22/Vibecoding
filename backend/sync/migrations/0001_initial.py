from __future__ import annotations

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SyncSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("auto_sync_enabled", models.BooleanField(default=False)),
                ("last_pull_at", models.DateTimeField(blank=True, null=True)),
                ("last_push_at", models.DateTimeField(blank=True, null=True)),
                ("last_sync_status", models.CharField(blank=True, max_length=32)),
                ("last_sync_message", models.TextField(blank=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="SyncLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("started_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("ok", "OK"), ("error", "Error")], default="ok", max_length=16)),
                ("message", models.TextField(blank=True)),
            ],
            options={
                "ordering": ("-started_at",),
            },
        ),
    ]
