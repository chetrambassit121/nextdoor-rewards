from django.conf import settings
from django.db import models


'''
Understanding the models
Model	                    Responsibility
UserRewardProfile	        Stores each user's lifetime and available points
RewardTransaction	        Records every points award or reversal
RewardMilestone	            Defines achievements and their requirements
UserMilestone	            Tracks achievements unlocked by users

A few important design decisions:
- settings.AUTH_USER_MODEL supports Django's configured user model.
- idempotency_key prevents the same reward event from being recorded twice.
- UniqueConstraint prevents duplicate milestone achievements.
- on_delete=models.PROTECT preserves milestone definitions that users have already earned.
- total_points represents lifetime earned points, while available_points is intended for future spending or deductions.
'''


class UserRewardProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reward_profile",
    )

    total_points = models.PositiveIntegerField(default=0)
    available_points = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.total_points} points"


class RewardTransaction(models.Model):
    class ActivityType(models.TextChoices):
        POST = "post", "Post Created"
        COMMENT = "comment", "Comment Created"
        LIKE = "like", "Post Liked"
        PROFILE = "profile", "Profile Completed"
        MILESTONE = "milestone", "Milestone Bonus"
        REVERSAL = "reversal", "Points Reversal"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reward_transactions",
    )

    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices,
    )

    points = models.IntegerField()

    reference_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.activity_type}: {self.points}"
        )


class RewardMilestone(models.Model):
    class MilestoneType(models.TextChoices):
        POSTS = "posts", "Posts Created"
        COMMENTS = "comments", "Comments Created"
        LIKES = "likes", "Likes Received"
        POINTS = "points", "Lifetime Points"

    name = models.CharField(max_length=100)
    description = models.TextField()

    milestone_type = models.CharField(
        max_length=20,
        choices=MilestoneType.choices,
    )

    required_count = models.PositiveIntegerField()

    bonus_points = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class UserMilestone(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="earned_milestones",
    )

    milestone = models.ForeignKey(
        RewardMilestone,
        on_delete=models.PROTECT,
        related_name="user_achievements",
    )

    achieved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "milestone"],
                name="unique_user_reward_milestone",
            )
        ]
        ordering = ["-achieved_at"]

    def __str__(self):
        return f"{self.user.username} - {self.milestone.name}"

