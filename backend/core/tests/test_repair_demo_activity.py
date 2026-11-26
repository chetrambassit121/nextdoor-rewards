
from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from community.models import Post, Comment, Like

from rewards.models import (
    UserRewardProfile,
    RewardTransaction,
    UserMilestone,
)


User = get_user_model()


class RepairDemoActivityTests(TestCase):

    def setUp(self):
        call_command(
            "seed_milestones",
            stdout=StringIO(),
        )

        call_command(
            "seed_users",
            count=10,
            stdout=StringIO(),
        )

        call_command(
            "seed_posts",
            count=50,
            stdout=StringIO(),
        )

        call_command(
            "seed_interactions",
            comments=100,
            likes=150,
            stdout=StringIO(),
        )

        self.real_user = User.objects.create_user(
            username="real_neighbor",
            email="neighbor@example.org",
            password="TestPassword123!",
        )

        self.real_post = Post.objects.create(
            author=self.real_user,
            content="This is a genuine community post.",
        )

        self.demo_posts = Post.objects.filter(
            author__username__startswith="demo_",
        )

    def run_repair(self, **kwargs):
        output = StringIO()

        call_command(
            "repair_demo_activity",
            stdout=output,
            **kwargs,
        )

        return output.getvalue()

    def test_repairs_user_registration_dates(self):
        self.run_repair()

        cutoff = timezone.now() - timedelta(days=180)

        users = User.objects.filter(
            username__startswith="demo_",
        )

        for user in users:
            self.assertLessEqual(
                user.date_joined,
                cutoff,
            )

    def test_repairs_post_timestamp_distribution(self):
        self.run_repair()

        timestamps = set(
            self.demo_posts.values_list(
                "created_at",
                flat=True,
            )
        )

        self.assertEqual(len(timestamps), 50)

    def test_preserves_post_ownership(self):
        before = dict(
            self.demo_posts.values_list(
                "pk",
                "author_id",
            )
        )

        self.run_repair()

        after = dict(
            self.demo_posts.values_list(
                "pk",
                "author_id",
            )
        )

        self.assertEqual(before, after)

    def test_comments_have_valid_timestamps(self):
        self.run_repair()

        comments = Comment.objects.select_related(
            "post", "user"
        )

        for comment in comments:
            self.assertGreaterEqual(
                comment.created_at,
                comment.post.created_at,
            )

            self.assertGreaterEqual(
                comment.created_at,
                comment.user.date_joined,
            )

    def test_likes_have_valid_timestamps(self):
        self.run_repair()

        likes = Like.objects.select_related(
            "post", "user"
        )

        for like in likes:
            self.assertGreaterEqual(
                like.created_at,
                like.post.created_at,
            )

            self.assertGreaterEqual(
                like.created_at,
                like.user.date_joined,
            )

    def test_real_user_and_post_are_unchanged(self):
        joined = self.real_user.date_joined
        created = self.real_post.created_at

        self.run_repair()

        self.real_user.refresh_from_db()
        self.real_post.refresh_from_db()

        self.assertEqual(
            self.real_user.date_joined,
            joined,
        )

        self.assertEqual(
            self.real_post.created_at,
            created,
        )

    def test_rewards_are_unchanged(self):
        profiles_before = list(
            UserRewardProfile.objects.order_by("pk").values()
        )

        transactions_before = list(
            RewardTransaction.objects.order_by("pk").values()
        )

        milestones_before = list(
            UserMilestone.objects.order_by("pk").values()
        )

        self.run_repair()

        self.assertEqual(
            profiles_before,
            list(
                UserRewardProfile.objects.order_by("pk").values()
            ),
        )

        self.assertEqual(
            transactions_before,
            list(
                RewardTransaction.objects.order_by("pk").values()
            ),
        )

        self.assertEqual(
            milestones_before,
            list(
                UserMilestone.objects.order_by("pk").values()
            ),
        )

    def test_dry_run_does_not_modify_database(self):
        models = [User, Post, Comment, Like]

        before = {
            model: list(
                model.objects.order_by("pk").values()
            )
            for model in models
        }

        output = self.run_repair(dry_run=True)

        for model in models:
            self.assertEqual(
                before[model],
                list(
                    model.objects.order_by("pk").values()
                ),
            )

        self.assertIn("No changes saved", output)

    def test_invalid_days_are_rejected(self):
        with self.assertRaises(CommandError):
            self.run_repair(days=0)

        with self.assertRaises(CommandError):
            self.run_repair(days=366)

    def test_record_counts_are_unchanged(self):
        models = [User, Post, Comment, Like]

        before = {
            model: model.objects.count()
            for model in models
        }

        self.run_repair()

        for model in models:
            self.assertEqual(
                before[model],
                model.objects.count(),
            )
