from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class PublicUserProfileSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()
    achievements_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "date_joined",
            "stats",
            "total_points",
            "achievements_count",
        ]
        read_only_fields = fields

    def get_stats(self, obj):
        return {
            "posts": obj.posts.count(),
            "comments": obj.comments.count(),
            "likes_received": sum(
                post.likes.count()
                for post in obj.posts.all()
            ),
        }

    def get_total_points(self, obj):
        profile = getattr(obj, "reward_profile", None)

        if profile is None:
            return 0

        return profile.total_points

    def get_achievements_count(self, obj):
        return obj.earned_milestones.count()
