import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_authenticated_user_can_view_profile():
    user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="TestPassword123!"
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/auth/profile/")

    assert response.status_code == 200
    assert response.data["username"] == "testuser"
    assert response.data["email"] == "test@example.com"


@pytest.mark.django_db
def test_unauthenticated_user_cannot_view_profile():
    client = APIClient()

    response = client.get("/api/auth/profile/")

    assert response.status_code == 401