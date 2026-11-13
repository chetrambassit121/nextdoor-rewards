from rest_framework import serializers

from .models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)


'''
Understanding the serializers
- UserRewardProfileSerializer exposes the user's balance.
- RewardTransactionSerializer exposes their reward history, including negative reversals.
- RewardMilestoneSerializer describes each achievement and its requirements.
- UserMilestoneSerializer nests milestone details with the date the user earned the achievement.
'''


class UserRewardProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRewardProfile
        fields = [
            "total_points",
            "available_points",
            "updated_at",
        ]
        read_only_fields = fields


class RewardTransactionSerializer(serializers.ModelSerializer):
    activity_display = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )

    class Meta:
        model = RewardTransaction
        fields = [
            "id",
            "activity_type",
            "activity_display",
            "points",
            "reference_id",
            "created_at",
        ]
        read_only_fields = fields


class RewardMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardMilestone
        fields = [
            "id",
            "name",
            "description",
            "milestone_type",
            "required_count",
            "bonus_points",
        ]
        read_only_fields = fields


class UserMilestoneSerializer(serializers.ModelSerializer):
    milestone = RewardMilestoneSerializer(read_only=True)

    class Meta:
        model = UserMilestone
        fields = [
            "id",
            "milestone",
            "achieved_at",
        ]
        read_only_fields = fields
