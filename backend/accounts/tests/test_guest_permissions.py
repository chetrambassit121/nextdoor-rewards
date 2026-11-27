
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.cache import cache
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.guest import GUEST_USERNAME
from community.models import Post, Comment, Like


User = get_user_model()


class GuestPermissionTests(APITestCase):

    def setUp(self):
        cache.clear()

        call_command("create_guest")

        self.guest = User.objects.get(
            username=GUEST_USERNAME
        )

        self.user = User.objects.create_user(
            username="regular_user",
            email="regular@example.com",
            password="StrongPassword123!",
        )

        self.post = Post.objects.create(
            author=self.user,
            content="Welcome to the neighborhood!",
        )

        self.post_url = (
            f"/api/community/posts/{self.post.pk}/"
        )

        self.comments_url = (
            f"{self.post_url}comments/"
        )

        self.like_url = (
            f"{self.post_url}like/"
        )

        self.authenticate(self.guest)

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {refresh.access_token}"
            )
        )

    def test_guest_can_view_posts(self):
        response = self.client.get(
            "/api/community/posts/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_guest_can_view_post_detail(self):
        response = self.client.get(self.post_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_guest_can_view_comments(self):
        response = self.client.get(self.comments_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_guest_cannot_create_post(self):
        response = self.client.post(
            "/api/community/posts/",
            {"content": "Guest test post"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            Post.objects.filter(
                author=self.guest
            ).exists()
        )

    def test_guest_cannot_delete_own_post(self):
        post = Post.objects.create(
            author=self.guest,
            content="Existing guest post",
        )

        response = self.client.delete(
            f"/api/community/posts/{post.pk}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Post.objects.filter(pk=post.pk).exists()
        )

    def test_guest_cannot_create_comment(self):
        response = self.client.post(
            self.comments_url,
            {"content": "Guest comment"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            Comment.objects.filter(
                user=self.guest
            ).exists()
        )

    def test_guest_cannot_delete_own_comment(self):
        comment = Comment.objects.create(
            post=self.post,
            user=self.guest,
            content="Existing guest comment",
        )

        response = self.client.delete(
            f"{self.comments_url}{comment.pk}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Comment.objects.filter(
                pk=comment.pk
            ).exists()
        )

    def test_guest_cannot_like_post(self):
        response = self.client.post(self.like_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            Like.objects.filter(
                post=self.post,
                user=self.guest,
            ).exists()
        )

    def test_guest_cannot_unlike_post(self):
        Like.objects.create(
            post=self.post,
            user=self.guest,
        )

        response = self.client.delete(self.like_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Like.objects.filter(
                post=self.post,
                user=self.guest,
            ).exists()
        )

    def test_guest_can_view_profile(self):
        response = self.client.get(
            reverse("user-profile")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_guest_cannot_update_profile(self):
        response = self.client.patch(
            reverse("user-profile"),
            {"first_name": "Modified"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.guest.refresh_from_db()

        self.assertNotEqual(
            self.guest.first_name,
            "Modified",
        )

    def test_guest_cannot_change_password(self):
        response = self.client.post(
            reverse("change-password"),
            {
                "current_password": "anything",
                "new_password": "NewPassword123!",
                "confirm_password": "NewPassword123!",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.guest.refresh_from_db()

        self.assertFalse(
            self.guest.has_usable_password()
        )

    def test_current_user_identifies_guest(self):
        response = self.client.get(
            reverse("current_user")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(response.data["is_guest"])

    def test_current_user_identifies_regular_user(self):
        self.authenticate(self.user)

        response = self.client.get(
            reverse("current_user")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(response.data["is_guest"])

    def test_regular_user_can_create_post(self):
        self.authenticate(self.user)

        response = self.client.post(
            "/api/community/posts/",
            {"content": "Regular user post"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_refreshed_guest_token_remains_restricted(self):
        self.client.credentials()

        login_response = self.client.post(
            reverse("guest-login")
        )

        self.assertEqual(
            login_response.status_code,
            status.HTTP_200_OK,
        )

        refresh_response = self.client.post(
            reverse("token_refresh"),
            {"refresh": login_response.data["refresh"]},
        )

        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_200_OK,
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {refresh_response.data['access']}"
            )
        )

        response = self.client.post(
            "/api/community/posts/",
            {"content": "Unauthorized guest post"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
