
from django.urls import path

from .views import (
    MyRewardsView,
    RewardTransactionListView,
    RewardMilestoneListView,
    UserAchievementListView,
)

urlpatterns = [
    path(
        "me/",
        MyRewardsView.as_view(),
        name="rewards-me",
    ),
    path(
        "transactions/",
        RewardTransactionListView.as_view(),
        name="rewards-transactions",
    ),
    path(
        "milestones/",
        RewardMilestoneListView.as_view(),
        name="rewards-milestones",
    ),
    path(
        "achievements/",
        UserAchievementListView.as_view(),
        name="rewards-achievements",
    ),
]
