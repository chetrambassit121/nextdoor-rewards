
import pytest

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APIClient

from rewards.models import (
    UserRewardProfile,
    RewardMilestone,
    UserMilestone,
)
from community.models import Post


pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def viewer():
    return User.objects.create_user(
        username="viewer_public",
        password="StrongPass123!",
    )


@pytest.fixture
def neighbor():
    return User.objects.create_user(
        username="neighbor_public",
        password="StrongPass123!",
    )


@pytest.fixture
def auth_client(viewer):
    client = APIClient()
    client.force_authenticate(user=viewer)
    return client


@pytest.fixture
def rewards_url(neighbor):
    return reverse(
        "public-user-rewards",
        kwargs={"user_id": neighbor.pk},
    )


def test_authenticated_user_can_view_rewards(
    auth_client, rewards_url, neighbor
):
    response = auth_client.get(rewards_url)

    assert response.status_code == 200
    assert response.data["user_id"] == neighbor.pk
    assert response.data["username"] == neighbor.username


def test_unauthenticated_user_is_rejected(rewards_url):
    response = APIClient().get(rewards_url)

    assert response.status_code == 401


def test_nonexistent_user_returns_404(auth_client):
    url = reverse(
        "public-user-rewards",
        kwargs={"user_id": 999999},
    )

    response = auth_client.get(url)

    assert response.status_code == 404


def test_new_user_has_zero_points(
    auth_client, rewards_url
):
    response = auth_client.get(rewards_url)

    assert response.status_code == 200
    assert response.data["total_points"] == 0
    assert response.data["achievements_count"] == 0
    assert response.data["achievements"] == []


def test_existing_points_are_returned(
    auth_client, rewards_url, neighbor
):
    UserRewardProfile.objects.update_or_create(
        user=neighbor,
        defaults={
            "total_points": 150,
            "available_points": 90,
        },
    )

    response = auth_client.get(rewards_url)

    assert response.data["total_points"] == 150


def test_earned_achievement_is_returned(
    auth_client, rewards_url, neighbor
):
    milestone = RewardMilestone.objects.create(
        name="Test Achievement",
        description="A test milestone",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    UserMilestone.objects.create(
        user=neighbor,
        milestone=milestone,
    )

    response = auth_client.get(rewards_url)

    assert response.data["achievements_count"] == 1

    achievement = response.data["achievements"][0]

    assert achievement["milestone"]["name"] == (
        "Test Achievement"
    )
    assert achievement["achieved_at"] is not None


def test_milestone_progress_uses_profile_owner(
    auth_client, rewards_url, neighbor, viewer
):
    milestone = RewardMilestone.objects.create(
        name="Post Progress",
        description="Create ten posts",
        milestone_type="posts",
        required_count=10,
        bonus_points=50,
    )

    Post.objects.create(
        author=neighbor,
        content="Neighbor's post",
    )

    Post.objects.create(
        author=viewer,
        content="Viewer's first post",
    )

    Post.objects.create(
        author=viewer,
        content="Viewer's second post",
    )

    response = auth_client.get(rewards_url)

    item = next(
        m for m in response.data["milestones"]
        if m["id"] == milestone.pk
    )

    assert item["current_progress"] == 1


def test_unlocked_milestone_is_marked(
    auth_client, rewards_url, neighbor
):
    milestone = RewardMilestone.objects.create(
        name="Unlocked Test",
        description="Earn an achievement",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    UserMilestone.objects.create(
        user=neighbor,
        milestone=milestone,
    )

    response = auth_client.get(rewards_url)

    item = next(
        m for m in response.data["milestones"]
        if m["id"] == milestone.pk
    )

    assert item["is_unlocked"] is True


def test_private_reward_fields_are_excluded(
    auth_client, rewards_url, neighbor
):
    UserRewardProfile.objects.update_or_create(
        user=neighbor,
        defaults={
            "total_points": 100,
            "available_points": 70,
        },
    )

    response = auth_client.get(rewards_url)

    assert response.status_code == 200
    assert "available_points" not in response.data
    assert "transactions" not in response.data
    assert "email" not in response.data


def test_public_rewards_are_read_only(
    auth_client, rewards_url
):
    response = auth_client.patch(
        rewards_url,
        {"total_points": 999999},
        format="json",
    )

    assert response.status_code == 405
