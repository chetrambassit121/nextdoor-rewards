from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User

from .serializers import RegisterSerializer, UserProfileSerializer, ChangePasswordSerializer

from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)

# class UserProfileView(generics.RetrieveUpdateAPIView):
#     serializer_class = UserProfileSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_object(self):
#         return self.request.user
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })


class ChangePasswordView(APIView):
    '''
        Understand the code
        Component	Purpose
        APIView	Creates a Django REST Framework API endpoint
        IsAuthenticated	Requires a valid JWT access token
        post()	Handles the password change request
        request.data	Receives the three password fields
        context={"request": request}	Allows the serializer to access the authenticated user
        is_valid()	Runs password validation
        save()	Hashes and saves the new password
        Response()	Returns a success message
    '''
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request}
        )

        # Step 1: Validate passwords
        serializer.is_valid(raise_exception=True)

        # Step 2: Save the new password
        serializer.save()

        # Step 3: Blacklist existing refresh tokens
        for token in OutstandingToken.objects.filter(user=request.user):
            BlacklistedToken.objects.get_or_create(token=token)

        # Step 4: Return success response
        return Response(
            {
                "message": "Password changed successfully."
            },
            status=status.HTTP_200_OK
        )


