import pytest

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from community.models import Post
from rewards.models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)


User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(
        username="reward_api_user",
        password="TestPassword123!",
    )


@pytest.fixture
def neighbor():
    return User.objects.create_user(
        username="reward_api_neighbor",
        password="TestPassword123!",
    )


@pytest.fixture
def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def neighbor_client(neighbor):
    client = APIClient()
    client.force_authenticate(user=neighbor)
    return client


# Test 1: Creating a post awards 10 points.

def test_create_post_awards_points(client_for, user):
    response = client_for.post(
        reverse("post-list"),
        {"content": "My new community post"},
        format="json",
    )

    assert response.status_code == 201

    profile = UserRewardProfile.objects.get(user=user)
    assert profile.total_points == 10


# Test 2: Creating a comment awards 5 points.

def test_create_comment_awards_points(
    client_for, user, neighbor
):
    post = Post.objects.create(
        author=neighbor,
        content="Neighborhood announcement",
    )

    response = client_for.post(
        reverse("post-comments", args=[post.pk]),
        {"content": "Thanks for the update!"},
        format="json",
    )

    assert response.status_code == 201

    profile = UserRewardProfile.objects.get(user=user)
    assert profile.total_points == 5


# Test 3: A like rewards the post author.

def test_like_awards_post_author(
    neighbor_client, user, neighbor
):
    post = Post.objects.create(
        author=user,
        content="Community gathering",
    )

    response = neighbor_client.post(
        reverse("post-like", args=[post.pk])
    )

    assert response.status_code == 201

    profile = UserRewardProfile.objects.get(user=user)
    assert profile.total_points == 2

    assert not UserRewardProfile.objects.filter(
        user=neighbor
    ).exists()


# Test 4: Duplicate likes cannot award twice.

def test_duplicate_like_no_extra_points(
    neighbor_client, user
):
    post = Post.objects.create(
        author=user,
        content="Community event",
    )

    url = reverse("post-like", args=[post.pk])

    first = neighbor_client.post(url)
    second = neighbor_client.post(url)

    assert first.status_code == 201
    assert second.status_code == 400

    profile = UserRewardProfile.objects.get(user=user)
    assert profile.total_points == 2

    assert RewardTransaction.objects.filter(
        user=user,
        activity_type="like",
    ).count() == 1


# Test 5: First post unlocks milestone.

def test_first_post_unlocks_milestone(
    client_for, user
):
    milestone = RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post.",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    response = client_for.post(
        reverse("post-list"),
        {"content": "My first post"},
        format="json",
    )

    assert response.status_code == 201

    profile = UserRewardProfile.objects.get(user=user)
    assert profile.total_points == 35

    assert UserMilestone.objects.filter(
        user=user,
        milestone=milestone,
    ).exists()


# Test 6: Unauthenticated users cannot create posts.

def test_anonymous_post_cannot_earn_points():
    client = APIClient()

    response = client.post(
        reverse("post-list"),
        {"content": "Anonymous post"},
        format="json",
    )

    assert response.status_code in (401, 403)
    assert RewardTransaction.objects.count() == 0


# Test 7: Self-likes cannot earn points.

def test_self_like_rejected(client_for, user):
    post = Post.objects.create(
        author=user,
        content="My own post",
    )

    response = client_for.post(
        reverse("post-like", args=[post.pk])
    )

    assert response.status_code == 400
    assert RewardTransaction.objects.count() == 0


# Test 8: Unliking is temporarily disabled.

def test_unlike_temporarily_disabled(
    neighbor_client, user
):
    post = Post.objects.create(
        author=user,
        content="Test post",
    )

    url = reverse("post-like", args=[post.pk])

    assert neighbor_client.post(url).status_code == 201

    response = neighbor_client.delete(url)

    assert response.status_code == 409

    profile = UserRewardProfile.objects.get(user=user)
    assert profile.total_points == 2
