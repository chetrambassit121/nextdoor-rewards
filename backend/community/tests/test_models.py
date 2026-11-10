
import pytest

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from community.models import Post, Comment, Like


User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testuser",
        password="TestPassword123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username="otheruser",
        password="TestPassword123!",
    )


@pytest.fixture
def post(user):
    return Post.objects.create(
        author=user,
        content="Hello Nextdoor community!",
    )


@pytest.mark.django_db
def test_create_post(user):
    post = Post.objects.create(
        author=user,
        content="My first community post",
    )

    assert post.author == user
    assert post.content == "My first community post"
    assert post.created_at is not None


@pytest.mark.django_db
def test_create_comment(post, other_user):
    comment = Comment.objects.create(
        user=other_user,
        post=post,
        content="Great post!",
    )

    assert comment.user == other_user
    assert comment.post == post
    assert comment.content == "Great post!"


@pytest.mark.django_db
def test_create_like(post, other_user):
    like = Like.objects.create(
        user=other_user,
        post=post,
    )

    assert like.user == other_user
    assert like.post == post


@pytest.mark.django_db
def test_prevent_duplicate_likes(post, other_user):
    Like.objects.create(
        user=other_user,
        post=post,
    )

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Like.objects.create(
                user=other_user,
                post=post,
            )

    assert Like.objects.count() == 1


@pytest.mark.django_db
def test_multiple_users_can_like_same_post(post, user, other_user):
    Like.objects.create(user=user, post=post)
    Like.objects.create(user=other_user, post=post)

    assert post.likes.count() == 2


@pytest.mark.django_db
def test_delete_post_cascades(post, other_user):
    Comment.objects.create(
        user=other_user,
        post=post,
        content="Nice post!",
    )
    Like.objects.create(
        user=other_user,
        post=post,
    )

    post.delete()

    assert Post.objects.count() == 0
    assert Comment.objects.count() == 0
    assert Like.objects.count() == 0


@pytest.mark.django_db
def test_count_user_posts(user):
    for i in range(5):
        Post.objects.create(
            author=user,
            content=f"Post number {i + 1}",
        )

    assert user.posts.count() == 5


@pytest.mark.django_db
def test_count_comments_on_other_users_posts(user, other_user):
    own_post = Post.objects.create(
        author=user,
        content="My post",
    )
    other_post = Post.objects.create(
        author=other_user,
        content="Someone else's post",
    )

    for i in range(10):
        Comment.objects.create(
            user=user,
            post=other_post,
            content=f"Comment {i + 1}",
        )

    Comment.objects.create(
        user=user,
        post=own_post,
        content="Comment on my own post",
    )

    qualifying_count = Comment.objects.filter(
        user=user,
    ).exclude(
        post__author=user,
    ).count()

    assert qualifying_count == 10
    assert user.comments.count() == 11


@pytest.mark.django_db
def test_count_likes_on_other_users_posts(user, other_user):
    own_post = Post.objects.create(
        author=user,
        content="My own post",
    )

    for i in range(50):
        other_post = Post.objects.create(
            author=other_user,
            content=f"Other user's post {i + 1}",
        )

        Like.objects.create(
            user=user,
            post=other_post,
        )

    Like.objects.create(
        user=user,
        post=own_post,
    )

    qualifying_count = Like.objects.filter(
        user=user,
    ).exclude(
        post__author=user,
    ).count()

    assert qualifying_count == 50
    assert user.likes.count() == 51


@pytest.mark.django_db
def test_reverse_relationships(post, user, other_user):
    Comment.objects.create(
        user=other_user,
        post=post,
        content="Hello!",
    )
    Like.objects.create(
        user=other_user,
        post=post,
    )

    assert user.posts.count() == 1
    assert post.comments.count() == 1
    assert post.likes.count() == 1
    assert other_user.comments.count() == 1
    assert other_user.likes.count() == 1
