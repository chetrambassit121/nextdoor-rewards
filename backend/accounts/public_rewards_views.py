
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rewards.models import (
    UserRewardProfile,
    RewardMilestone,
    UserMilestone,
)
from rewards.serializers import (
    RewardMilestoneSerializer,
    UserMilestoneSerializer,
)
from rewards.services import _milestone_progress


User = get_user_model()


class PublicUserRewardsView(APIView):
    """
    Read-only rewards for another community member.

    GET /api/users/<user_id>/rewards/
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def get(self, request, user_id):
        # 1. Find the requested user.
        user = get_object_or_404(
            User,
            pk=user_id,
        )

        # 2. Get their points without modifying the database.
        profile = UserRewardProfile.objects.filter(
            user=user
        ).first()

        total_points = (
            profile.total_points if profile else 0
        )

        # 3. Retrieve their earned achievements.
        achievements = list(
            UserMilestone.objects.filter(
                user=user
            )
            .select_related("milestone")
            .order_by("-achieved_at", "-id")
        )

        achievement_data = UserMilestoneSerializer(
            achievements,
            many=True,
        ).data

        unlocked_ids = {
            achievement.milestone_id
            for achievement in achievements
        }

        # 4. Retrieve active milestone definitions.
        milestones = list(
            RewardMilestone.objects.filter(
                is_active=True
            ).order_by("required_count", "id")
        )

        # 5. Calculate progress once per milestone type.
        progress = {}

        for milestone in milestones:
            milestone_type = milestone.milestone_type

            if milestone_type not in progress:
                progress[milestone_type] = (
                    _milestone_progress(
                        user,
                        milestone_type,
                    )
                )

        # 6. Add progress and unlock status.
        milestone_data = RewardMilestoneSerializer(
            milestones,
            many=True,
        ).data

        milestone_results = []

        for milestone, data in zip(
            milestones,
            milestone_data,
        ):
            item = dict(data)

            item["current_progress"] = progress[
                milestone.milestone_type
            ]

            item["is_unlocked"] = (
                milestone.pk in unlocked_ids
            )

            milestone_results.append(item)

        # 7. Return only public reward information.
        return Response({
            "user_id": user.pk,
            "username": user.username,
            "total_points": total_points,
            "achievements_count": len(achievements),
            "achievements": achievement_data,
            "milestones": milestone_results,
        })
