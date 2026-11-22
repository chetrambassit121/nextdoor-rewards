
from django.urls import path

from .public_views import PublicUserProfileView
from .public_rewards_views import PublicUserRewardsView


urlpatterns = [
    path(
        "<int:user_id>/rewards/",
        PublicUserRewardsView.as_view(),
        name="public-user-rewards",
    ),
    path(
        "<int:user_id>/",
        PublicUserProfileView.as_view(),
        name="public-user-profile",
    ),
]

