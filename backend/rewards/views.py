
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)
from .serializers import (
    UserRewardProfileSerializer,
    RewardTransactionSerializer,
    RewardMilestoneSerializer,
    UserMilestoneSerializer,
)
from .services import _milestone_progress


class MyRewardsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserRewardProfile.objects.get_or_create(
            user=request.user
        )

        serializer = UserRewardProfileSerializer(profile)
        return Response(serializer.data)


class RewardTransactionListView(generics.ListAPIView):
    serializer_class = RewardTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RewardTransaction.objects.filter(
            user=self.request.user
        ).order_by("-created_at", "-id")


class RewardMilestoneListView(generics.ListAPIView):
    serializer_class = RewardMilestoneSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return RewardMilestone.objects.filter(
            is_active=True
        ).order_by("required_count", "id")

    def list(self, request, *args, **kwargs):
        milestones = self.get_queryset()
        serializer = self.get_serializer(milestones, many=True)

        unlocked_ids = set(
            UserMilestone.objects.filter(
                user=request.user
            ).values_list("milestone_id", flat=True)
        )

        progress = {}

        for milestone in milestones:
            milestone_type = milestone.milestone_type

            if milestone_type not in progress:
                progress[milestone_type] = _milestone_progress(
                    request.user,
                    milestone_type,
                )

        results = []

        for milestone, data in zip(
            milestones, serializer.data
        ):
            item = dict(data)
            item["current_progress"] = progress[
                milestone.milestone_type
            ]
            item["is_unlocked"] = (
                milestone.pk in unlocked_ids
            )
            results.append(item)

        return Response(results)


class UserAchievementListView(generics.ListAPIView):
    serializer_class = UserMilestoneSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return UserMilestone.objects.filter(
            user=self.request.user
        ).select_related("milestone").order_by(
            "-achieved_at", "-id"
        )
