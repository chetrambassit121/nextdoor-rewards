import pytest

from django.contrib.auth import get_user_model

from community.models import Post, Comment, Like
from rewards.models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)
from rewards.services import (
    award_activity_points,
    evaluate_user_milestones,
)


User = get_user_model()


# -----------------------------------
# Fixtures
# -----------------------------------

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="serviceuser",
        password="TestPassword123!",
    )


@pytest.fixture
def neighbor(db):
    return User.objects.create_user(
        username="neighbor",
        password="TestPassword123!",
    )


# -----------------------------------
# Test 1 — Post Awards 10 Points
# -----------------------------------

@pytest.mark.django_db
def test_post_awards_10_points(user):
    post = Post.objects.create(
        author=user,
        content="Hello neighbors!",
    )

    reward, created = award_activity_points(
        user, "post", post.pk
    )

    profile = UserRewardProfile.objects.get(user=user)

    assert created is True
    assert reward.points == 10
    assert profile.total_points == 10
    assert profile.available_points == 10


# -----------------------------------
# Test 2 — Prevent Duplicate Rewards
# -----------------------------------

@pytest.mark.django_db
def test_duplicate_post_does_not_award_twice(user):
    post = Post.objects.create(
        author=user,
        content="Duplicate prevention test",
    )

    award_activity_points(user, "post", post.pk)

    _, created = award_activity_points(
        user, "post", post.pk
    )

    profile = UserRewardProfile.objects.get(user=user)

    assert created is False
    assert profile.total_points == 10

    assert RewardTransaction.objects.filter(
        user=user,
        activity_type="post",
    ).count() == 1


# -----------------------------------
# Test 3 — Comment Awards 5 Points
# -----------------------------------

@pytest.mark.django_db
def test_comment_awards_5_points(user, neighbor):
    post = Post.objects.create(
        author=neighbor,
        content="Neighborhood update",
    )

    comment = Comment.objects.create(
        user=user,
        post=post,
        content="Thanks for sharing!",
    )

    reward, created = award_activity_points(
        user, "comment", comment.pk
    )

    assert created is True
    assert reward.points == 5

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 5


# -----------------------------------
# Test 4 — Like Rewards Post Author
# -----------------------------------

@pytest.mark.django_db
def test_like_rewards_post_author(user, neighbor):
    post = Post.objects.create(
        author=user,
        content="Community event",
    )

    like = Like.objects.create(
        user=neighbor,
        post=post,
    )

    reward, created = award_activity_points(
        user, "like", like.pk
    )

    assert created is True
    assert reward.points == 2
    assert reward.user == user


# -----------------------------------
# Test 5 — Reject Wrong Recipient
# -----------------------------------

@pytest.mark.django_db
def test_wrong_recipient_cannot_claim_points(user, neighbor):
    post = Post.objects.create(
        author=user,
        content="My post",
    )

    with pytest.raises(ValueError):
        award_activity_points(
            neighbor, "post", post.pk
        )

    assert RewardTransaction.objects.count() == 0


# -----------------------------------
# Test 6 — First Post Unlocks Milestone
# -----------------------------------

@pytest.mark.django_db
def test_first_post_unlocks_milestone(user):
    milestone = RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post.",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    post = Post.objects.create(
        author=user,
        content="My first post",
    )

    award_activity_points(user, "post", post.pk)

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 35

    assert UserMilestone.objects.filter(
        user=user,
        milestone=milestone,
    ).exists()


# -----------------------------------
# Test 7 — Milestone Bonus Awarded Once
# -----------------------------------

@pytest.mark.django_db
def test_milestone_bonus_awarded_once(user):
    milestone = RewardMilestone.objects.create(
        name="First Steps",
        description="Create your first post.",
        milestone_type="posts",
        required_count=1,
        bonus_points=25,
    )

    post = Post.objects.create(
        author=user,
        content="First post",
    )

    award_activity_points(user, "post", post.pk)

    evaluate_user_milestones(user)
    evaluate_user_milestones(user)

    assert UserMilestone.objects.filter(
        user=user,
        milestone=milestone,
    ).count() == 1

    assert RewardTransaction.objects.filter(
        user=user,
        activity_type="milestone",
    ).count() == 1

    profile = UserRewardProfile.objects.get(user=user)

    assert profile.total_points == 35


# -----------------------------------
# Test 8 — Reject Invalid Activity
# -----------------------------------

@pytest.mark.django_db
def test_invalid_activity_rejected(user):
    with pytest.raises(ValueError):
        award_activity_points(
            user, "invalid", 1
        )
