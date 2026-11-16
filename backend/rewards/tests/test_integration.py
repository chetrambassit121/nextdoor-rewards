import pytest

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from rewards.models import RewardMilestone, RewardTransaction

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def users():
    author = User.objects.create_user(
        username="integration_author",
        password="TestPassword123!",
    )
    neighbor = User.objects.create_user(
        username="integration_neighbor",
        password="TestPassword123!",
    )
    return author, neighbor


@pytest.fixture
def clients(users):
    author, neighbor = users

    author_client = APIClient()
    author_client.force_authenticate(user=author)

    neighbor_client = APIClient()
    neighbor_client.force_authenticate(user=neighbor)

    return author_client, neighbor_client


def balance(client):
    response = client.get(reverse("rewards-me"))
    assert response.status_code == 200
    return response.data


def transactions(client):
    response = client.get(
        reverse("rewards-transactions")
    )
    assert response.status_code == 200

    data = response.data
    return data["results"] if isinstance(data, dict) else data


def create_post(client):
    response = client.post(
        "/api/community/posts/",
        {"content": "Neighborhood cleanup this weekend!"},
        format="json",
    )
    assert response.status_code == 201, response.data
    return response.data["id"]


def test_post_creation_updates_rewards(clients):
    author_client, _ = clients

    assert balance(author_client)["total_points"] == 0

    create_post(author_client)

    assert balance(author_client)["total_points"] == 10
    assert balance(author_client)["available_points"] == 10

    history = transactions(author_client)

    assert any(
        item["activity_type"] == "post"
        and item["points"] == 10
        for item in history
    )


def test_comment_creation_updates_rewards(clients):
    author_client, neighbor_client = clients
    post_id = create_post(author_client)

    response = neighbor_client.post(
        f"/api/community/posts/{post_id}/comments/",
        {"content": "I'll be there!"},
        format="json",
    )

    assert response.status_code == 201, response.data

    assert balance(neighbor_client)["total_points"] == 5
    assert balance(author_client)["total_points"] == 10


def test_like_rewards_post_author(clients):
    author_client, neighbor_client = clients
    post_id = create_post(author_client)

    response = neighbor_client.post(
        f"/api/community/posts/{post_id}/like/"
    )

    assert response.status_code == 201

    assert balance(author_client)["total_points"] == 12
    assert balance(neighbor_client)["total_points"] == 0


def test_unlike_reverses_author_points(clients):
    author_client, neighbor_client = clients
    post_id = create_post(author_client)

    url = f"/api/community/posts/{post_id}/like/"

    assert neighbor_client.post(url).status_code == 201
    assert balance(author_client)["total_points"] == 12

    assert neighbor_client.delete(url).status_code == 204
    assert balance(author_client)["total_points"] == 10

    history = transactions(author_client)

    assert any(
        item["activity_type"] == "reversal"
        and item["points"] == -2
        for item in history
    )


def test_post_deletion_reverses_rewards(clients):
    author_client, _ = clients
    post_id = create_post(author_client)

    response = author_client.delete(
        f"/api/community/posts/{post_id}/"
    )

    assert response.status_code == 204
    assert balance(author_client)["total_points"] == 0

    assert any(
        item["points"] == -10
        for item in transactions(author_client)
    )


def test_post_unlocks_milestone(clients):
    author_client, _ = clients

    milestone = RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
        is_active=True,
    )

    create_post(author_client)

    assert balance(author_client)["total_points"] == 35

    achievements = author_client.get(
        reverse("rewards-achievements")
    )

    assert achievements.status_code == 200
    assert any(
        item["milestone"]["id"] == milestone.id
        for item in achievements.data
    )

    milestones = author_client.get(
        reverse("rewards-milestones")
    )

    assert milestones.status_code == 200

    matched = next(
        item for item in milestones.data
        if item["id"] == milestone.id
    )

    assert matched["current_progress"] == 1
    assert matched["is_unlocked"] is True


def test_rewards_are_private(clients):
    author_client, neighbor_client = clients

    create_post(author_client)

    assert balance(author_client)["total_points"] == 10
    assert balance(neighbor_client)["total_points"] == 0
    assert transactions(neighbor_client) == []


def test_unauthenticated_rewards_request():
    client = APIClient()

    response = client.get(reverse("rewards-me"))

    assert response.status_code == 401