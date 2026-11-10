from rest_framework import serializers
from .models import Post, Comment, Like


class PostSerializer(serializers.ModelSerializer):
    author = serializers.CharField(
        source="author.username",
        read_only=True,
    )
    comments_count = serializers.IntegerField(
        source="comments.count",
        read_only=True,
    )
    likes_count = serializers.IntegerField(
        source="likes.count",
        read_only=True,
    )

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "content",
            "comments_count",
            "likes_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "created_at",
            "updated_at",
        ]


class CommentSerializer(serializers.ModelSerializer):
    user = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "post",
            "content",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "post",
            "created_at",
        ]
