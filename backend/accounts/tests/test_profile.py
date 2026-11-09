import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()

@pytest.mark.django_db
def test_user_can_update_profile():
    user = User.objects.create_user(
        username="testuser",
        email="old@example.com",
        password="TestPassword123!"
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("user-profile")

    response = client.patch(
        url,
        {
            "first_name": "John",
            "last_name": "Smith",
            "email": "new@example.com"
        },
        format="json"
    )

    assert response.status_code == 200

    user.refresh_from_db()

    assert user.first_name == "John"
    assert user.last_name == "Smith"
    assert user.email == "new@example.com"


@pytest.mark.django_db
def test_profile_update_requires_authentication():
    client = APIClient()

    response = client.patch(
        reverse("user-profile"),
        {"first_name": "John"},
        format="json"
    )

    assert response.status_code in [401, 403]


@pytest.mark.django_db
def test_user_cannot_change_username():
    user = User.objects.create_user(
        username="original",
        password="TestPassword123!"
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("user-profile"),
        {"username": "hacker"},
        format="json"
    )

    assert response.status_code == 200

    user.refresh_from_db()

    assert user.username == "original"


@pytest.mark.django_db
def test_duplicate_email_is_rejected():
    User.objects.create_user(
        username="existing",
        email="taken@example.com",
        password="TestPassword123!"
    )

    user = User.objects.create_user(
        username="second",
        email="second@example.com",
        password="TestPassword123!"
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("user-profile"),
        {"email": "taken@example.com"},
        format="json"
    )

    assert response.status_code == 400
    assert "email" in response.data


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