from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Sum
from django.test import TestCase
from django.utils import timezone

from community.models import Post
from rewards.models import (
    RewardTransaction,
    UserRewardProfile,
    UserMilestone,
)


User = get_user_model()


class SeedPostsCommandTests(TestCase):

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

        self.demo_users = User.objects.filter(
            username__startswith="demo_",
            email__endswith="@example.com",
        )

    def run_seed_command(self, count=20, **kwargs):
        output = StringIO()

        call_command(
            "seed_posts",
            count=count,
            stdout=output,
            **kwargs,
        )

        return output.getvalue()

    def get_demo_posts(self):
        return Post.objects.filter(
            author__in=self.demo_users,
            content__contains="[Demo post #",
        )

    def test_creates_requested_number_of_posts(self):
        self.run_seed_command(count=20)

        self.assertEqual(
            self.get_demo_posts().count(),
            20,
        )

    def test_posts_belong_to_fictional_users(self):
        self.run_seed_command(count=20)

        for post in Post.objects.all():
            self.assertTrue(
                post.author.username.startswith("demo_")
            )

            self.assertFalse(
                post.author.has_usable_password()
            )

    def test_generated_posts_have_unique_content(self):
        self.run_seed_command(count=20)

        contents = set(
            self.get_demo_posts().values_list(
                "content",
                flat=True,
            )
        )

        self.assertEqual(len(contents), 20)

    def test_command_is_idempotent(self):
        self.run_seed_command(count=20)
        self.run_seed_command(count=20)

        self.assertEqual(
            self.get_demo_posts().count(),
            20,
        )

    def test_increasing_count_creates_additional_posts(self):
        self.run_seed_command(count=10)
        self.run_seed_command(count=20)

        self.assertEqual(
            self.get_demo_posts().count(),
            20,
        )

    def test_post_timestamps_are_valid(self):
        self.demo_users.update(
            date_joined=timezone.now() - timedelta(days=100)
        )

        self.run_seed_command(
            count=20,
            days=30,
        )

        now = timezone.now()
        earliest = now - timedelta(days=30, seconds=10)

        for post in self.get_demo_posts():
            self.assertGreaterEqual(
                post.created_at,
                earliest,
            )

            self.assertLessEqual(
                post.created_at,
                now,
            )

            self.assertGreaterEqual(
                post.created_at,
                post.author.date_joined,
            )

            self.assertEqual(
                post.created_at,
                post.updated_at,
            )

    def test_post_reward_transactions_are_created(self):
        self.run_seed_command(count=20)

        rewards = RewardTransaction.objects.filter(
            activity_type="post",
            user__in=self.demo_users,
        )

        self.assertEqual(rewards.count(), 20)

        self.assertEqual(
            rewards.aggregate(total=Sum("points"))["total"],
            200,
        )

    def test_rerunning_does_not_duplicate_rewards(self):
        self.run_seed_command(count=20)
        self.run_seed_command(count=20)

        self.assertEqual(
            RewardTransaction.objects.filter(
                activity_type="post",
                user__in=self.demo_users,
            ).count(),
            20,
        )

    def test_first_post_milestone_is_awarded(self):
        self.run_seed_command(count=20)

        authors = self.get_demo_posts().values_list(
            "author_id",
            flat=True,
        ).distinct()

        achievements = UserMilestone.objects.filter(
            user_id__in=authors,
            milestone__name="First Steps",
        )

        expected_count = (
            self.get_demo_posts()
            .order_by()
            .values("author_id")
            .distinct()
            .count()
        )

        self.assertEqual(
            achievements.count(),
            expected_count,
        )

    def test_existing_real_users_are_not_used(self):
        real_user = User.objects.create_user(
            username="real_neighbor",
            email="neighbor@example.org",
            password="SecurePassword123!",
        )

        existing_post = Post.objects.create(
            author=real_user,
            content="This is a real community post.",
        )

        self.run_seed_command(count=20)

        existing_post.refresh_from_db()

        self.assertEqual(
            existing_post.content,
            "This is a real community post.",
        )

        self.assertEqual(
            Post.objects.filter(author=real_user).count(),
            1,
        )

        self.assertFalse(
            RewardTransaction.objects.filter(
                user=real_user
            ).exists()
        )

    def test_dry_run_does_not_save_posts_or_rewards(self):
        self.run_seed_command(
            count=20,
            dry_run=True,
        )

        self.assertEqual(
            self.get_demo_posts().count(),
            0,
        )

        self.assertFalse(
            RewardTransaction.objects.filter(
                user__in=self.demo_users
            ).exists()
        )

        self.assertFalse(
            UserMilestone.objects.filter(
                user__in=self.demo_users
            ).exists()
        )

        for profile in UserRewardProfile.objects.filter(
            user__in=self.demo_users
        ):
            self.assertEqual(profile.total_points, 0)
            self.assertEqual(profile.available_points, 0)

    def test_missing_demo_users_raises_error(self):
        self.demo_users.delete()

        with self.assertRaises(CommandError):
            self.run_seed_command(count=10)

    def test_invalid_post_count_raises_error(self):
        for count in [0, -1, 10001]:
            with self.subTest(count=count):
                with self.assertRaises(CommandError):
                    self.run_seed_command(count=count)

    def test_invalid_days_raises_error(self):
        for days in [0, -1, 366]:
            with self.subTest(days=days):
                with self.assertRaises(CommandError):
                    self.run_seed_command(
                        count=10,
                        days=days,
                    )

    @patch(
        "community.management.commands.seed_posts"
        ".award_activity_points"
    )
    def test_reward_failure_rolls_back_posts(self, mock_award):
        mock_award.side_effect = RuntimeError(
            "Reward service failed"
        )

        with self.assertRaises(RuntimeError):
            self.run_seed_command(count=10)

        self.assertEqual(
            self.get_demo_posts().count(),
            0,
        )


    def test_posts_are_distributed_across_authors(self):
        self.run_seed_command(count=100)

        unique_authors = (
            self.get_demo_posts()
            .values("author_id")
            .distinct()
            .count()
        )

        self.assertGreaterEqual(unique_authors, 5)


    def test_latest_posts_have_author_diversity(self):
        self.run_seed_command(count=100)

        latest_posts = (
            self.get_demo_posts()
            .order_by("-created_at", "-pk")[:10]
        )

        unique_authors = {
            post.author_id
            for post in latest_posts
        }

        self.assertGreaterEqual(
            len(unique_authors),
            3,
        )


    def test_generated_timestamps_are_varied(self):
        self.run_seed_command(count=100)

        timestamps = set(
            self.get_demo_posts().values_list(
                "created_at",
                flat=True,
            )
        )

        self.assertGreater(len(timestamps), 90)