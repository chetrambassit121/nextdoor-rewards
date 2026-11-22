
from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .public_serializers import PublicUserProfileSerializer

User = get_user_model()


class PublicUserProfileView(generics.RetrieveAPIView):
    """
    Read-only public profile for an authenticated user.

    GET /api/users/<user_id>/
    """

    serializer_class = PublicUserProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]
    lookup_field = "pk"
    lookup_url_kwarg = "user_id"

    def get_queryset(self):
        return User.objects.select_related(
            "reward_profile"
        )
