from django.db import transaction
from django.db.models import F, Sum

from community.models import Post, Comment, Like
from .models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)

from django.db import transaction
from django.db.models import F, Sum, Value
from django.db.models.functions import Greatest


'''
Understanding the functions
Function	                    Responsibility
_get_activity()	                Verifies a post, comment, or like exists
_add_points()	                Updates the user's points using F() expressions
award_activity_points()	        Awards activity points once
_milestone_progress()	        Calculates progress toward milestones
_award_milestone_bonus()	    Awards a one-time bonus
evaluate_user_milestones()	    Unlocks eligible achievements
'''




POINT_RULES = {
    RewardTransaction.ActivityType.POST: 10,
    RewardTransaction.ActivityType.COMMENT: 5,
    RewardTransaction.ActivityType.LIKE: 2,
    RewardTransaction.ActivityType.PROFILE: 20,
}


def _get_activity(activity_type, reference_id):
    """
    Verify the activity exists and identify its reward recipient.
    """
    if activity_type == RewardTransaction.ActivityType.POST:
        activity = Post.objects.get(pk=reference_id)
        return activity, activity.author_id

    if activity_type == RewardTransaction.ActivityType.COMMENT:
        activity = Comment.objects.get(pk=reference_id)
        return activity, activity.user_id

    if activity_type == RewardTransaction.ActivityType.LIKE:
        activity = Like.objects.select_related("post").get(
            pk=reference_id
        )

        if activity.user_id == activity.post.author_id:
            raise ValueError("Self-likes cannot earn rewards.")

        return activity, activity.post.author_id

    raise ValueError("Unsupported activity type.")


def _add_points(user_id, points):
    """
    Atomically update the user's reward balance.
    """
    profile, _ = UserRewardProfile.objects.get_or_create(
        user_id=user_id
    )

    UserRewardProfile.objects.filter(pk=profile.pk).update(
        total_points=F("total_points") + points,
        available_points=F("available_points") + points,
    )


@transaction.atomic
def award_activity_points(
    user,
    activity_type,
    reference_id,
):
    """
    Award points for a verified community activity.

    Returns:
        (reward_transaction, created)
    """
    if activity_type not in POINT_RULES:
        raise ValueError("Unsupported activity type.")

    if activity_type == RewardTransaction.ActivityType.PROFILE:
        raise ValueError(
            "Profile completion requires separate verification."
        )

    if reference_id is None:
        raise ValueError("An activity reference is required.")

    activity, recipient_id = _get_activity(
        activity_type,
        reference_id,
    )

    if user.pk != recipient_id:
        raise ValueError(
            "User is not the reward recipient."
        )

    key = f"{activity_type}:{activity.pk}:create"

    # Serialize reward processing for this user on databases
    # supporting SELECT FOR UPDATE (such as PostgreSQL).
    user_model = type(user)
    user_model.objects.select_for_update().get(pk=user.pk)

    reward, created = RewardTransaction.objects.get_or_create(
        idempotency_key=key,
        defaults={
            "user_id": recipient_id,
            "activity_type": activity_type,
            "reference_id": activity.pk,
            "points": POINT_RULES[activity_type],
        },
    )

    if not created:
        return reward, False

    _add_points(recipient_id, reward.points)

    evaluate_user_milestones(user)

    return reward, True


@transaction.atomic
def reverse_activity_points(activity_type, reference_id):
    """
    Reverse points awarded for an activity.

    Returns:
        (reversal_transaction, created)

    If the original activity earned no points,
    returns (None, False).
    """
    if activity_type not in (
        RewardTransaction.ActivityType.POST,
        RewardTransaction.ActivityType.COMMENT,
        RewardTransaction.ActivityType.LIKE,
    ):
        raise ValueError("Unsupported reversal activity type.")

    original_key = f"{activity_type}:{reference_id}:create"
    reversal_key = f"{activity_type}:{reference_id}:reverse"

    original = RewardTransaction.objects.filter(
        idempotency_key=original_key,
    ).first()

    if original is None:
        return None, False

    # Lock the recipient to serialize reward changes.
    type(original.user).objects.select_for_update().get(
        pk=original.user_id
    )

    reversal, created = RewardTransaction.objects.get_or_create(
        idempotency_key=reversal_key,
        defaults={
            "user_id": original.user_id,
            "activity_type": RewardTransaction.ActivityType.REVERSAL,
            "reference_id": reference_id,
            "points": -original.points,
        },
    )

    if not created:
        return reversal, False

    # Preserve the original and reversal transactions.
    # Clamp balances to zero to respect PositiveIntegerField.
    profile, _ = UserRewardProfile.objects.get_or_create(
        user_id=original.user_id
    )

    UserRewardProfile.objects.filter(pk=profile.pk).update(
        total_points=Greatest(
            F("total_points") - original.points,
            Value(0),
        ),
        available_points=Greatest(
            F("available_points") - original.points,
            Value(0),
        ),
    )

    return reversal, True



def _milestone_progress(user, milestone_type):
    """
    Calculate a user's progress toward a milestone.
    """
    if milestone_type == RewardMilestone.MilestoneType.POSTS:
        return Post.objects.filter(author=user).count()

    if milestone_type == RewardMilestone.MilestoneType.COMMENTS:
        return Comment.objects.filter(user=user).count()

    if milestone_type == RewardMilestone.MilestoneType.LIKES:
        return Like.objects.filter(
            post__author=user
        ).exclude(user=user).count()

    
    if milestone_type == RewardMilestone.MilestoneType.POINTS:
        return max(
            0,
            RewardTransaction.objects.filter(
                user=user,
            )
            .exclude(
                activity_type=RewardTransaction.ActivityType.MILESTONE
            )
            .aggregate(total=Sum("points"))["total"]
            or 0,
        )


    return 0


def _award_milestone_bonus(user, milestone):
    """
    Award a one-time milestone bonus.

    Called only after the milestone is newly unlocked.
    """
    if milestone.bonus_points <= 0:
        return

    RewardTransaction.objects.create(
        user=user,
        activity_type=RewardTransaction.ActivityType.MILESTONE,
        points=milestone.bonus_points,
        reference_id=milestone.pk,
        idempotency_key=f"milestone:{user.pk}:{milestone.pk}",
    )

    _add_points(user.pk, milestone.bonus_points)


@transaction.atomic
def evaluate_user_milestones(user):
    """
    Unlock eligible milestones and award one-time bonuses.

    Returns a list of newly unlocked UserMilestone objects.
    """
    type(user).objects.select_for_update().get(pk=user.pk)

    unlocked = []

    milestones = RewardMilestone.objects.filter(
        is_active=True
    ).order_by("pk")

    for milestone in milestones:
        progress = _milestone_progress(
            user,
            milestone.milestone_type,
        )

        if progress < milestone.required_count:
            continue

        achievement, created = UserMilestone.objects.get_or_create(
            user=user,
            milestone=milestone,
        )

        if not created:
            continue

        _award_milestone_bonus(user, milestone)
        unlocked.append(achievement)

    return unlocked
