from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()


class ChangePasswordSerializer(serializers.Serializer):
    '''
        What this code does
        Method	Purpose
        validate_current_password()	Checks that the user knows their existing password
        validate()	Checks matching passwords, prevents reuse of the current password, and enforces Django password rules
        set_password()	Securely hashes the new password
        save()	Updates the user's password in the database

        Important: Never update a password using user.password = new_password. Django's set_password() is necessary to hash it correctly.
    '''
    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )

    def validate_current_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate(self, attrs):
        new_password = attrs["new_password"]
        confirm_password = attrs["confirm_password"]
        user = self.context["request"].user

        if new_password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        if user.check_password(new_password):
            raise serializers.ValidationError({
                "new_password": "New password must be different from the current password."
            })

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "new_password": exc.messages
            }) from exc

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
        ]
        read_only_fields = ["id", "username"]

    def validate_email(self, value):
        email = value.strip()

        if User.objects.exclude(
            pk=self.instance.pk
        ).filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "This email is already in use."
            )

        return email


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










