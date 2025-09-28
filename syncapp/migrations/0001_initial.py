from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='SyncSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('auto_sync_enabled', models.BooleanField(default=False)),
                ('last_pull_at', models.DateTimeField(blank=True, null=True)),
                ('last_push_at', models.DateTimeField(blank=True, null=True)),
                ('last_sync_status', models.JSONField(blank=True, default=dict)),
            ],
        ),
    ]
