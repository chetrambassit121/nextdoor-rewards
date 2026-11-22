from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from community.models import Post, Comment, Like
from rewards.models import (
    UserRewardProfile,
    RewardMilestone,
    UserMilestone,
)

User = get_user_model()


class PublicUserProfileTests(APITestCase):

    def setUp(self):
        self.viewer = User.objects.create_user(
            username="viewer",
            password="StrongPass123!"
        )

        self.author = User.objects.create_user(
            username="sarah_dev",
            email="sarah@example.com",
            password="StrongPass123!"
        )

        self.url = reverse(
            "public-user-profile",
            kwargs={"user_id": self.author.id}
        )

        self.client.force_authenticate(user=self.viewer)

    def test_authenticated_user_can_view_profile(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )
        self.assertEqual(
            response.data["username"],
            "sarah_dev"
        )
        self.assertEqual(
            response.data["id"],
            self.author.id
        )

    def test_profile_activity_counts(self):
        post = Post.objects.create(
            author=self.author,
            content="Hello neighbors!"
        )

        Comment.objects.create(
            user=self.author,
            post=post,
            content="My comment"
        )

        Like.objects.create(
            user=self.viewer,
            post=post
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.data["stats"]["posts"], 1
        )
        self.assertEqual(
            response.data["stats"]["comments"], 1
        )
        self.assertEqual(
            response.data["stats"]["likes_received"], 1
        )

    def test_profile_returns_reward_points(self):
        UserRewardProfile.objects.update_or_create(
            user=self.author,
            defaults={
                "total_points": 125,
                "available_points": 100,
            }
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.data["total_points"], 125
        )

    def test_profile_counts_achievements(self):
        milestone = RewardMilestone.objects.create(
            name="First Steps",
            description="Create your first post",
            milestone_type="posts",
            required_count=1,
            bonus_points=25,
        )

        UserMilestone.objects.create(
            user=self.author,
            milestone=milestone
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.data["achievements_count"], 1
        )

    def test_nonexistent_user_returns_404(self):
        url = reverse(
            "public-user-profile",
            kwargs={"user_id": 999999}
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND
        )

    def test_unauthenticated_user_cannot_view_profile(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ]
        )

    def test_private_fields_are_not_exposed(self):
        response = self.client.get(self.url)

        self.assertNotIn("email", response.data)
        self.assertNotIn("password", response.data)
        self.assertNotIn("available_points", response.data)
        self.assertNotIn("reward_transactions", response.data)

    def test_profile_is_read_only(self):
        response = self.client.patch(
            self.url,
            {"username": "hacked"},
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED
        )

















