
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from rest_framework_simplejwt.tokens import (
    AccessToken,
    RefreshToken,
)

from accounts.guest import GUEST_USERNAME, GUEST_EMAIL
from rewards.models import UserRewardProfile


User = get_user_model()


class GuestLoginTests(APITestCase):

    def setUp(self):
        cache.clear()

        self.url = reverse("guest-login")

        call_command("create_guest")

        self.guest = User.objects.get(
            username=GUEST_USERNAME
        )

    def test_guest_account_configuration(self):
        self.assertTrue(self.guest.is_active)
        self.assertFalse(self.guest.is_staff)
        self.assertFalse(self.guest.is_superuser)
        self.assertFalse(self.guest.has_usable_password())

    def test_guest_reward_profile_exists(self):
        self.assertTrue(
            UserRewardProfile.objects.filter(
                user=self.guest
            ).exists()
        )

    def test_create_guest_is_idempotent(self):
        call_command("create_guest")

        self.assertEqual(
            User.objects.filter(
                username=GUEST_USERNAME
            ).count(),
            1,
        )

    def test_guest_login_success(self):
        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        self.assertEqual(
            response.data["user"]["username"],
            GUEST_USERNAME,
        )

        self.assertTrue(
            response.data["user"]["is_guest"]
        )

    def test_guest_jwt_claims(self):
        response = self.client.post(self.url)

        access = AccessToken(response.data["access"])
        refresh = RefreshToken(response.data["refresh"])

        self.assertTrue(access["is_guest"])
        self.assertTrue(refresh["is_guest"])

    def test_guest_can_access_current_user(self):
        response = self.client.post(self.url)

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {response.data['access']}"
            )
        )

        response = self.client.get(
            reverse("current_user")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["username"],
            GUEST_USERNAME,
        )

    def test_guest_can_refresh_token(self):
        response = self.client.post(self.url)

        response = self.client.post(
            reverse("token_refresh"),
            {"refresh": response.data["refresh"]},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        access = AccessToken(response.data["access"])

        self.assertTrue(access["is_guest"])

    def test_missing_guest_account(self):
        self.guest.delete()

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def test_inactive_guest_account(self):
        self.guest.is_active = False
        self.guest.save(update_fields=["is_active"])

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def test_privileged_guest_account_is_rejected(self):
        self.guest.is_staff = True
        self.guest.save(update_fields=["is_staff"])

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def test_guest_cannot_use_regular_login(self):
        response = self.client.post(
            reverse("login"),
            {
                "username": GUEST_USERNAME,
                "password": "SomePassword123!",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_reserved_guest_username(self):
        self.guest.delete()

        response = self.client.post(
            reverse("register"),
            {
                "username": "Guest",
                "email": "visitor@example.com",
                "password": "StrongPassword123!",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn("username", response.data)

    def test_reserved_guest_email(self):
        self.guest.delete()

        response = self.client.post(
            reverse("register"),
            {
                "username": "visitor123",
                "email": GUEST_EMAIL,
                "password": "StrongPassword123!",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn("email", response.data)
