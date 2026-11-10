import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.settings import api_settings

'''
    Understand what we're testing
    Test	Expected result
    Successful password change	200 OK; new password works
    Incorrect current password	400 Bad Request
    Passwords don't match	400 Bad Request
    Weak password	400 Bad Request
    Reusing current password	400 Bad Request
    Unauthenticated request	401 Unauthorized
    Missing required fields	400 Bad Request
'''




User = get_user_model()

OLD_PASSWORD = "OldPassword123!"
NEW_PASSWORD = "NewPassword456!"


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password=OLD_PASSWORD
    )


@pytest.fixture
def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def change_password_url():
    return reverse("change-password")


def password_payload(
    current=OLD_PASSWORD,
    new=NEW_PASSWORD,
    confirm=NEW_PASSWORD
):
    return {
        "current_password": current,
        "new_password": new,
        "confirm_password": confirm,
    }


def test_change_password_success(
    user, authenticated_client, change_password_url
):
    response = authenticated_client.post(
        change_password_url,
        password_payload(),
        format="json"
    )

    assert response.status_code == 200
    assert response.data["message"] == (
        "Password changed successfully."
    )

    user.refresh_from_db()

    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(OLD_PASSWORD)


def test_incorrect_current_password(
    user, authenticated_client, change_password_url
):
    response = authenticated_client.post(
        change_password_url,
        password_payload(current="WrongPassword123!"),
        format="json"
    )

    assert response.status_code == 400
    assert "current_password" in response.data

    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD)


def test_passwords_do_not_match(
    user, authenticated_client, change_password_url
):
    response = authenticated_client.post(
        change_password_url,
        password_payload(confirm="DifferentPassword456!"),
        format="json"
    )

    assert response.status_code == 400
    assert "confirm_password" in response.data

    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD)


def test_weak_password_rejected(
    user, authenticated_client, change_password_url
):
    response = authenticated_client.post(
        change_password_url,
        password_payload(new="123", confirm="123"),
        format="json"
    )

    assert response.status_code == 400
    assert "new_password" in response.data

    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD)


def test_cannot_reuse_current_password(
    user, authenticated_client, change_password_url
):
    response = authenticated_client.post(
        change_password_url,
        password_payload(
            new=OLD_PASSWORD,
            confirm=OLD_PASSWORD
        ),
        format="json"
    )

    assert response.status_code == 400
    assert "new_password" in response.data

    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD)


def test_change_password_requires_authentication(
    change_password_url,
):
    client = APIClient()

    response = client.post(
        change_password_url,
        password_payload(),
        format="json"
    )

    assert response.status_code == 401


def test_missing_password_fields(
    user, authenticated_client, change_password_url
):
    response = authenticated_client.post(
        change_password_url,
        {"current_password": OLD_PASSWORD},
        format="json"
    )

    assert response.status_code == 400
    assert "new_password" in response.data
    assert "confirm_password" in response.data

    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD)



@pytest.mark.django_db
def test_old_access_token_invalid_after_password_change(user):
    refresh = RefreshToken.for_user(user)
    old_access = str(refresh.access_token)

    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {old_access}"
    )

    # Verify the token works before the password changes.
    before = client.get(reverse("current_user"))
    assert before.status_code == 200

    # Change the password using the original access token.
    changed = client.post(
        reverse("change-password"),
        password_payload(),
        format="json"
    )
    assert changed.status_code == 200

    # The original token must now be rejected.
    after = client.get(reverse("current_user"))
    assert after.status_code == 401


@pytest.mark.django_db
def test_old_refresh_token_invalid_after_password_change(user):
    refresh = RefreshToken.for_user(user)
    old_refresh = str(refresh)

    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
    )

    changed = client.post(
        reverse("change-password"),
        password_payload(),
        format="json"
    )
    assert changed.status_code == 200

    client.credentials()

    response = client.post(
        reverse("token_refresh"),
        {"refresh": old_refresh},
        format="json"
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_new_tokens_work_after_password_change(user):
    client = APIClient()

    client.credentials(
        HTTP_AUTHORIZATION=(
            f"Bearer {RefreshToken.for_user(user).access_token}"
        )
    )

    changed = client.post(
        reverse("change-password"),
        password_payload(),
        format="json"
    )
    assert changed.status_code == 200

    user.refresh_from_db()

    new_access = str(RefreshToken.for_user(user).access_token)

    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {new_access}"
    )

    response = client.get(reverse("current_user"))

    assert response.status_code == 200
