from __future__ import annotations

from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "role", "display_name")


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    default_error_messages = {
        "invalid_credentials": _("Invalid email or password"),
        "inactive": _("User account is disabled"),
    }

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(username=email, password=password)
        if not user:
            self.fail("invalid_credentials")
        if not user.is_active:
            self.fail("inactive")
        attrs["user"] = user
        return attrs
