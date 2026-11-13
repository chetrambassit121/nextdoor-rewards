import pytest

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APIClient

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
        username="rewards_api_user",
        password="TestPassword123!",
    )


@pytest.fixture
def neighbor():
    return User.objects.create_user(
        username="rewards_api_neighbor",
        password="TestPassword123!",
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# Test 1: Unauthenticated users are rejected.
def test_rewards_require_authentication():
    client = APIClient()

    for name in [
        "rewards-me",
        "rewards-transactions",
        "rewards-milestones",
        "rewards-achievements",
    ]:
        response = client.get(reverse(name))
        assert response.status_code == 401


# Test 2: New users have zero points.
def test_new_user_rewards_balance(auth_client, user):
    response = auth_client.get(reverse("rewards-me"))

    assert response.status_code == 200
    assert response.data["total_points"] == 0
    assert response.data["available_points"] == 0

    assert UserRewardProfile.objects.filter(
        user=user
    ).count() == 1


# Test 3: Existing balance is returned.
def test_rewards_balance(auth_client, user):
    UserRewardProfile.objects.create(
        user=user,
        total_points=100,
        available_points=80,
    )

    response = auth_client.get(reverse("rewards-me"))

    assert response.status_code == 200
    assert response.data["total_points"] == 100
    assert response.data["available_points"] == 80


# Test 4: Transactions belong to the current user.
def test_transactions_are_private(
    auth_client, user, neighbor
):
    RewardTransaction.objects.create(
        user=user,
        activity_type="post",
        points=10,
        reference_id=1,
        idempotency_key="test:user:post",
    )

    RewardTransaction.objects.create(
        user=neighbor,
        activity_type="post",
        points=10,
        reference_id=2,
        idempotency_key="test:neighbor:post",
    )

    response = auth_client.get(
        reverse("rewards-transactions")
    )

    assert response.status_code == 200

    data = response.data
    transactions = (
        data["results"] if isinstance(data, dict) else data
    )

    assert len(transactions) == 1
    assert transactions[0]["reference_id"] == 1


# Test 5: Reversal transactions are visible.
def test_transactions_include_reversals(
    auth_client, user
):
    RewardTransaction.objects.create(
        user=user,
        activity_type="reversal",
        points=-10,
        reference_id=5,
        idempotency_key="test:reversal:5",
    )

    response = auth_client.get(
        reverse("rewards-transactions")
    )

    data = response.data
    transactions = (
        data["results"] if isinstance(data, dict) else data
    )

    assert response.status_code == 200
    assert transactions[0]["points"] == -10
    assert transactions[0]["activity_type"] == "reversal"


# Test 6: Only active milestones are listed.
def test_only_active_milestones(auth_client):
    RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    RewardMilestone.objects.create(
        name="Inactive Milestone",
        description="Not available",
        milestone_type="posts",
        required_count=100,
        bonus_points=50,
        is_active=False,
    )

    response = auth_client.get(
        reverse("rewards-milestones")
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["name"] == "First Steps"
    assert response.data[0]["current_progress"] == 0
    assert response.data[0]["is_unlocked"] is False


# Test 7: User milestone achievements are private.
def test_user_achievements(auth_client, user, neighbor):
    milestone = RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    UserMilestone.objects.create(
        user=neighbor,
        milestone=milestone,
    )

    response = auth_client.get(
        reverse("rewards-achievements")
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["milestone"]["name"] == (
        "First Steps"
    )


# Test 8: Rewards endpoints are read-only.
def test_rewards_endpoints_are_read_only(auth_client):
    for name in [
        "rewards-me",
        "rewards-transactions",
        "rewards-milestones",
        "rewards-achievements",
    ]:
        response = auth_client.post(
            reverse(name),
            {"points": 9999},
            format="json",
        )

        assert response.status_code == 405
