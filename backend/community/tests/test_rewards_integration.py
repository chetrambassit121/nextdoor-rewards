import pytest

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from community.models import Post, Comment, Like
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


# Test 8: Test 8 — Unlike reverses points

def test_unlike_reverses_points(
    neighbor_client, user
):
    post = Post.objects.create(
        author=user,
        content="Unlike reversal test",
    )

    url = reverse("post-like", args=[post.pk])

    assert neighbor_client.post(url).status_code == 201

    response = neighbor_client.delete(url)

    assert response.status_code == 204

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 0
    assert Like.objects.count() == 0

    assert RewardTransaction.objects.filter(
        activity_type="reversal"
    ).count() == 1


# Test 9 — Deleting a post reverses its points

def test_delete_post_reverses_points(client_for, user):
    response = client_for.post(
        reverse("post-list"),
        {"content": "Post to delete"},
        format="json",
    )

    assert response.status_code == 201

    post_id = response.data["id"]

    delete_response = client_for.delete(
        reverse("post-detail", args=[post_id])
    )

    assert delete_response.status_code == 204

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 0
    assert not Post.objects.filter(pk=post_id).exists()


# Test 10 — Deleting a post reverses associated likes


def test_delete_post_reverses_likes(
    client_for, neighbor_client, user
):
    post = Post.objects.create(
        author=user,
        content="Post with likes",
    )

    response = neighbor_client.post(
        reverse("post-like", args=[post.pk])
    )

    assert response.status_code == 201

    delete_response = client_for.delete(
        reverse("post-detail", args=[post.pk])
    )

    assert delete_response.status_code == 204

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 0
    assert Like.objects.count() == 0


# Test 11 — Deleting a comment reverses its points


def test_delete_comment_reverses_points(
    client_for, user, neighbor
):
    post = Post.objects.create(
        author=neighbor,
        content="Neighborhood post",
    )

    response = client_for.post(
        reverse("post-comments", args=[post.pk]),
        {"content": "My comment"},
        format="json",
    )

    assert response.status_code == 201

    comment_id = response.data["id"]

    delete_response = client_for.delete(
        reverse(
            "post-delete-comment",
            args=[post.pk, comment_id],
        )
    )

    assert delete_response.status_code == 204

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 0
    assert not Comment.objects.filter(
        pk=comment_id
    ).exists()


# Test 12 — Deleting someone else's post is forbidden

def test_cannot_delete_other_users_post(
    neighbor_client, user
):
    post = Post.objects.create(
        author=user,
        content="Protected post",
    )

    response = neighbor_client.delete(
        reverse("post-detail", args=[post.pk])
    )

    assert response.status_code == 403
    assert Post.objects.filter(pk=post.pk).exists()


# Test 13 — Deleting a post reverses commenters' points


def test_delete_post_reverses_comment_rewards(
    client_for, neighbor_client, user, neighbor
):
    post = Post.objects.create(
        author=user,
        content="Post with neighbor comment",
    )

    response = neighbor_client.post(
        reverse("post-comments", args=[post.pk]),
        {"content": "Neighbor comment"},
        format="json",
    )

    assert response.status_code == 201

    profile = UserRewardProfile.objects.get(user=neighbor)
    assert profile.total_points == 5

    delete_response = client_for.delete(
        reverse("post-detail", args=[post.pk])
    )

    assert delete_response.status_code == 204

    profile.refresh_from_db()
    assert profile.total_points == 0
    assert Comment.objects.count() == 0


# Test 14 — Repeated unlike returns 404


def test_unlike_twice_returns_404(
    neighbor_client, user
):
    post = Post.objects.create(
        author=user,
        content="Repeated unlike test",
    )

    url = reverse("post-like", args=[post.pk])

    assert neighbor_client.post(url).status_code == 201
    assert neighbor_client.delete(url).status_code == 204
    assert neighbor_client.delete(url).status_code == 404

    assert RewardTransaction.objects.filter(
        activity_type="reversal"
    ).count() == 1


