
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

from rest_framework_simplejwt.tokens import RefreshToken

from .guest import GUEST_USERNAME, is_guest_user


User = get_user_model()


class GuestLoginThrottle(AnonRateThrottle):
    scope = "guest_login"
    rate = "10/min"


class GuestLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestLoginThrottle]

    def post(self, request):
        guest = User.objects.filter(
            username=GUEST_USERNAME,
            is_active=True,
        ).first()

        if guest is None or not is_guest_user(guest):
            return Response(
                {
                    "detail": "Guest login is currently unavailable."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        refresh = RefreshToken.for_user(guest)
        refresh["is_guest"] = True

        access = refresh.access_token

        return Response(
            {
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": guest.pk,
                    "username": guest.username,
                    "email": guest.email,
                    "is_guest": True,
                },
            },
            status=status.HTTP_200_OK,
        )
