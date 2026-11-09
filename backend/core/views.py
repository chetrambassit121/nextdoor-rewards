
# from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
# from django.contrib.auth.models import User
# from rest_framework.permissions import IsAuthenticated

# from .serializers import UserProfileSerializer


# class UserProfileView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         serializer = UserProfileSerializer(request.user)
#         return Response(serializer.data)


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({
            "status": "success",
            "message": "React connected to Django!"
        })



