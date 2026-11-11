
import pytest

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APIClient

from community.models import Post, Comment, Like


User = get_user_model()

pytestmark = pytest.mark.django_db


# ----------------------------------------
# Fixtures
# ----------------------------------------

@pytest.fixture
def user():
    return User.objects.create_user(
        username="testuser",
        password="TestPassword123!",
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        username="otheruser",
        password="TestPassword123!",
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def other_client(other_user):
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client


@pytest.fixture
def post(user):
    return Post.objects.create(
        author=user,
        content="Hello Nextdoor community!",
    )


# ----------------------------------------
# Post API Tests
# ----------------------------------------

def test_list_posts_public(api_client, post):
    url = reverse("post-list")
    response = api_client.get(url)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["content"] == post.content


def test_create_post_authenticated(authenticated_client, user):
    url = reverse("post-list")

    response = authenticated_client.post(
        url,
        {"content": "My first community post"},
        format="json",
    )

    assert response.status_code == 201
    assert Post.objects.count() == 1
    assert Post.objects.first().author == user
    assert response.data["author"] == user.username


def test_create_post_unauthenticated(api_client):
    response = api_client.post(
        reverse("post-list"),
        {"content": "Unauthorized post"},
        format="json",
    )

    assert response.status_code == 401
    assert Post.objects.count() == 0


def test_retrieve_post(api_client, post):
    response = api_client.get(
        reverse("post-detail", args=[post.id])
    )

    assert response.status_code == 200
    assert response.data["id"] == post.id
    assert response.data["content"] == post.content


def test_delete_own_post(authenticated_client, post):
    response = authenticated_client.delete(
        reverse("post-detail", args=[post.id])
    )

    assert response.status_code == 204
    assert not Post.objects.filter(id=post.id).exists()


def test_cannot_delete_other_users_post(other_client, post):
    response = other_client.delete(
        reverse("post-detail", args=[post.id])
    )

    assert response.status_code == 403
    assert Post.objects.filter(id=post.id).exists()


def test_create_post_without_content(authenticated_client):
    response = authenticated_client.post(
        reverse("post-list"),
        {},
        format="json",
    )

    assert response.status_code == 400
    assert Post.objects.count() == 0


# ----------------------------------------
# Comment API Tests
# ----------------------------------------

def test_list_comments_public(api_client, post, other_user):
    Comment.objects.create(
        user=other_user,
        post=post,
        content="Great post!",
    )

    response = api_client.get(
        reverse("post-comments", args=[post.id])
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["content"] == "Great post!"


def test_create_comment(other_client, post, other_user):
    response = other_client.post(
        reverse("post-comments", args=[post.id]),
        {"content": "Nice post!"},
        format="json",
    )

    assert response.status_code == 201
    assert Comment.objects.count() == 1
    assert Comment.objects.first().user == other_user
    assert Comment.objects.first().post == post


def test_cannot_comment_on_own_post(authenticated_client, post):
    response = authenticated_client.post(
        reverse("post-comments", args=[post.id]),
        {"content": "My own comment"},
        format="json",
    )

    assert response.status_code == 400
    assert Comment.objects.count() == 0


def test_comment_requires_authentication(api_client, post):
    response = api_client.post(
        reverse("post-comments", args=[post.id]),
        {"content": "Anonymous comment"},
        format="json",
    )

    assert response.status_code == 401
    assert Comment.objects.count() == 0


# ----------------------------------------
# Like API Tests
# ----------------------------------------

def test_like_post(other_client, post, other_user):
    response = other_client.post(
        reverse("post-like", args=[post.id])
    )

    assert response.status_code == 201
    assert Like.objects.filter(
        user=other_user,
        post=post,
    ).exists()


def test_cannot_like_same_post_twice(other_client, post):
    url = reverse("post-like", args=[post.id])

    first_response = other_client.post(url)
    second_response = other_client.post(url)

    assert first_response.status_code == 201
    assert second_response.status_code == 400
    assert Like.objects.count() == 1


def test_cannot_like_own_post(authenticated_client, post):
    response = authenticated_client.post(
        reverse("post-like", args=[post.id])
    )

    assert response.status_code == 400
    assert Like.objects.count() == 0


def test_unlike_post(other_client, post, other_user):
    Like.objects.create(
        user=other_user,
        post=post,
    )

    response = other_client.delete(
        reverse("post-like", args=[post.id])
    )

    assert response.status_code == 204
    assert Like.objects.count() == 0


def test_unlike_not_liked_post(other_client, post):
    response = other_client.delete(
        reverse("post-like", args=[post.id])
    )

    assert response.status_code == 404


def test_like_requires_authentication(api_client, post):
    response = api_client.post(
        reverse("post-like", args=[post.id])
    )

    assert response.status_code == 401
    assert Like.objects.count() == 0


# ----------------------------------------
# Post Count Tests
# ----------------------------------------

def test_post_comment_and_like_counts(
    api_client, post, other_user
):
    Comment.objects.create(
        user=other_user,
        post=post,
        content="Great post!",
    )

    Like.objects.create(
        user=other_user,
        post=post,
    )

    response = api_client.get(
        reverse("post-detail", args=[post.id])
    )

    assert response.status_code == 200
    assert response.data["comments_count"] == 1
    assert response.data["likes_count"] == 1
