from django.urls import path
from .views import HealthCheckView #UserProfileView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    # path("profile/", UserProfileView.as_view(), name="profile"),
]