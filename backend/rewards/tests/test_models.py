import pytest

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError

from rewards.models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)


User = get_user_model()

'''
Understand What We're Testing
UserRewardProfile
We verify that a new reward profile starts with zero points, belongs to exactly one user, and has the correct string representation.
RewardTransaction
We verify that transactions store activity details, support negative point adjustments, and reject duplicate idempotency keys.

The database constraint protects against duplicate records, but it does not automatically award points or update balances. We'll implement that logic separately.
RewardMilestone
We verify that milestone requirements are stored correctly and that default values work as expected.
UserMilestone
We verify that users can unlock achievements, cannot unlock the same achievement twice, and that earned milestone definitions are protected from deletion.
'''


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="rewarduser",
        email="rewarduser@example.com",
        password="TestPassword123!",
    )


@pytest.fixture
def milestone(db):
    return RewardMilestone.objects.create(
        name="Community Contributor",
        description="Create 10 community posts.",
        milestone_type=RewardMilestone.MilestoneType.POSTS,
        required_count=10,
        bonus_points=50,
    )


# -----------------------------------
# UserRewardProfile Tests
# -----------------------------------

@pytest.mark.django_db
def test_create_user_reward_profile(user):
    profile = UserRewardProfile.objects.create(user=user)

    assert profile.user == user
    assert profile.total_points == 0
    assert profile.available_points == 0
    assert profile.created_at is not None
    assert profile.updated_at is not None


@pytest.mark.django_db
def test_user_reward_profile_one_to_one(user):
    UserRewardProfile.objects.create(user=user)

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            UserRewardProfile.objects.create(user=user)


@pytest.mark.django_db
def test_user_reward_profile_str(user):
    profile = UserRewardProfile.objects.create(
        user=user,
        total_points=100,
        available_points=80,
    )

    assert str(profile) == "rewarduser - 100 points"


# -----------------------------------
# RewardTransaction Tests
# -----------------------------------

@pytest.mark.django_db
def test_create_reward_transaction(user):
    reward = RewardTransaction.objects.create(
        user=user,
        activity_type=RewardTransaction.ActivityType.POST,
        points=10,
        reference_id=1,
        idempotency_key="post:1:create",
    )

    assert reward.user == user
    assert reward.activity_type == "post"
    assert reward.points == 10
    assert reward.reference_id == 1
    assert reward.created_at is not None


@pytest.mark.django_db
def test_reward_transaction_unique_idempotency_key(user):
    RewardTransaction.objects.create(
        user=user,
        activity_type=RewardTransaction.ActivityType.POST,
        points=10,
        idempotency_key="post:1:create",
    )

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            RewardTransaction.objects.create(
                user=user,
                activity_type=RewardTransaction.ActivityType.POST,
                points=10,
                idempotency_key="post:1:create",
            )


@pytest.mark.django_db
def test_reward_transaction_allows_negative_points(user):
    reward = RewardTransaction.objects.create(
        user=user,
        activity_type=RewardTransaction.ActivityType.REVERSAL,
        points=-10,
        idempotency_key="post:1:reversal",
    )

    assert reward.points == -10


@pytest.mark.django_db
def test_reward_transaction_str(user):
    reward = RewardTransaction.objects.create(
        user=user,
        activity_type=RewardTransaction.ActivityType.COMMENT,
        points=5,
        idempotency_key="comment:1:create",
    )

    assert str(reward) == "rewarduser - comment: 5"


# -----------------------------------
# RewardMilestone Tests
# -----------------------------------

@pytest.mark.django_db
def test_create_reward_milestone(milestone):
    assert milestone.name == "Community Contributor"
    assert milestone.milestone_type == "posts"
    assert milestone.required_count == 10
    assert milestone.bonus_points == 50
    assert milestone.is_active is True


@pytest.mark.django_db
def test_reward_milestone_default_bonus_points():
    milestone = RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post.",
        milestone_type=RewardMilestone.MilestoneType.POSTS,
        required_count=1,
    )

    assert milestone.bonus_points == 0
    assert milestone.is_active is True


@pytest.mark.django_db
def test_reward_milestone_str(milestone):
    assert str(milestone) == "Community Contributor"


# -----------------------------------
# UserMilestone Tests
# -----------------------------------

@pytest.mark.django_db
def test_create_user_milestone(user, milestone):
    achievement = UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    assert achievement.user == user
    assert achievement.milestone == milestone
    assert achievement.achieved_at is not None


@pytest.mark.django_db
def test_user_cannot_unlock_same_milestone_twice(user, milestone):
    UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            UserMilestone.objects.create(
                user=user,
                milestone=milestone,
            )


@pytest.mark.django_db
def test_different_users_can_unlock_same_milestone(user, milestone):
    second_user = User.objects.create_user(
        username="seconduser",
        password="TestPassword123!",
    )

    UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    UserMilestone.objects.create(
        user=second_user,
        milestone=milestone,
    )

    assert UserMilestone.objects.filter(
        milestone=milestone
    ).count() == 2


@pytest.mark.django_db
def test_cannot_delete_earned_milestone(user, milestone):
    UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    with pytest.raises(ProtectedError):
        milestone.delete()


@pytest.mark.django_db
def test_user_milestone_str(user, milestone):
    achievement = UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    assert str(achievement) == (
        "rewarduser - Community Contributor"
    )


# -----------------------------------
# Relationship Tests
# -----------------------------------

@pytest.mark.django_db
def test_user_reward_profile_reverse_relationship(user):
    profile = UserRewardProfile.objects.create(user=user)

    assert user.reward_profile == profile


@pytest.mark.django_db
def test_user_reward_transactions_reverse_relationship(user):
    RewardTransaction.objects.create(
        user=user,
        activity_type=RewardTransaction.ActivityType.POST,
        points=10,
        idempotency_key="post:1:create",
    )

    assert user.reward_transactions.count() == 1


@pytest.mark.django_db
def test_user_earned_milestones_reverse_relationship(user, milestone):
    UserMilestone.objects.create(
        user=user,
        milestone=milestone,
    )

    assert user.earned_milestones.count() == 1
