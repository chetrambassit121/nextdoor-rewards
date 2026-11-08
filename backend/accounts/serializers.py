from django.contrib.auth.models import User
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = value.strip().lower()

        if not email:
            raise serializers.ValidationError(
                "Email is required."
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )

        return email

    def validate(self, attrs):
        password = attrs.get("password")

        from django.contrib.auth.password_validation import (
            validate_password
        )

        validate_password(password)

        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)