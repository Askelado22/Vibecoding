from __future__ import annotations

from django.db import migrations, models
import django.utils.timezone

import items.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Item',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('product_url', models.URLField(unique=True, validators=[items.validators.validate_product_url])),
                ('assignee_name', models.CharField(blank=True, max_length=255)),
                ('move_status', models.CharField(blank=True, choices=[('Да', 'Да'), ('Нет', 'Нет'), ('Иероглифы', 'Иероглифы'), ('Нет в наличии', 'Нет в наличии'), ('Уже перенесен', 'Уже перенесен'), ('Перенос не нужен', 'Перенос не нужен')], max_length=64)),
                ('move_status_set_by', models.EmailField(blank=True, max_length=254)),
                ('move_status_set_at', models.DateTimeField(blank=True, null=True)),
                ('final_breadcrumbs', models.TextField(blank=True, validators=[items.validators.validate_final_breadcrumbs])),
                ('breadcrumbs_set_by', models.EmailField(blank=True, max_length=254)),
                ('breadcrumbs_set_at', models.DateTimeField(blank=True, null=True)),
                ('priority_raw', models.CharField(blank=True, max_length=255)),
                ('completed_by', models.EmailField(blank=True, max_length=254)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('moved_flag_raw', models.CharField(blank=True, max_length=255)),
                ('comment', models.TextField(blank=True)),
                ('is_completed', models.BooleanField(default=False)),
                ('row_index', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={'ordering': ['-updated_at']},
        ),
    ]
