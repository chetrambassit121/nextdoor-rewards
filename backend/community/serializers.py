
from rest_framework import serializers
from .models import Post, Comment


class PostSerializer(serializers.ModelSerializer):
    author = serializers.CharField(
        source="author.username",
        read_only=True,
    )
    comments_count = serializers.IntegerField(
        source="comments_total",
        read_only=True,
    )
    likes_count = serializers.IntegerField(
        source="likes_total",
        read_only=True,
    )
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "content",
            "comments_count",
            "likes_count",
            "is_liked",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "created_at",
            "updated_at",
        ]

    def get_is_liked(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return getattr(obj, "user_has_liked", False)

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Post content cannot be empty."
            )

        if len(value) > 2000:
            raise serializers.ValidationError(
                "Post content cannot exceed 2000 characters."
            )

        return value


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

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Comment content cannot be empty."
            )

        if len(value) > 1000:
            raise serializers.ValidationError(
                "Comment content cannot exceed 1000 characters."
            )

        return value
