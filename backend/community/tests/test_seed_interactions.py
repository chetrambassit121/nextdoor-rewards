from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import F, Sum
from django.test import TestCase
from django.utils import timezone

from community.models import Post, Comment, Like

from rewards.models import (
    RewardTransaction,
    UserRewardProfile,
    UserMilestone,
)


User = get_user_model()


class SeedInteractionsCommandTests(TestCase):

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
            count=20,
            stdout=StringIO(),
        )

    def run_seed_command(
        self,
        comments=30,
        likes=50,
        **kwargs,
    ):
        output = StringIO()

        call_command(
            "seed_interactions",
            comments=comments,
            likes=likes,
            stdout=output,
            **kwargs,
        )

        return output.getvalue()

    def test_creates_requested_comments(self):
        self.run_seed_command()

        self.assertEqual(
            Comment.objects.count(),
            30,
        )

    def test_creates_requested_likes(self):
        self.run_seed_command()

        self.assertEqual(
            Like.objects.count(),
            50,
        )

    def test_users_cannot_comment_on_own_posts(self):
        self.run_seed_command()

        self.assertFalse(
            Comment.objects.filter(
                user_id=F("post__author_id")
            ).exists()
        )

    def test_users_cannot_like_own_posts(self):
        self.run_seed_command()

        self.assertFalse(
            Like.objects.filter(
                user_id=F("post__author_id")
            ).exists()
        )

    def test_no_duplicate_likes(self):
        self.run_seed_command()

        unique_pairs = Like.objects.values(
            "user_id",
            "post_id",
        ).distinct().count()

        self.assertEqual(
            unique_pairs,
            Like.objects.count(),
        )

    def test_command_is_idempotent(self):
        self.run_seed_command()

        transaction_count = (
            RewardTransaction.objects.count()
        )

        self.run_seed_command()

        self.assertEqual(
            Comment.objects.count(),
            30,
        )

        self.assertEqual(
            Like.objects.count(),
            50,
        )

        self.assertEqual(
            RewardTransaction.objects.count(),
            transaction_count,
        )

    def test_can_increase_interaction_targets(self):
        self.run_seed_command(
            comments=10,
            likes=20,
        )

        self.run_seed_command(
            comments=30,
            likes=50,
        )

        self.assertEqual(
            Comment.objects.count(),
            30,
        )

        self.assertEqual(
            Like.objects.count(),
            50,
        )

    def test_comment_rewards_go_to_comment_author(self):
        self.run_seed_command()

        for comment in Comment.objects.all():
            reward = RewardTransaction.objects.get(
                activity_type="comment",
                reference_id=comment.pk,
            )

            self.assertEqual(
                reward.user_id,
                comment.user_id,
            )

            self.assertEqual(reward.points, 5)

    def test_like_rewards_go_to_post_author(self):
        self.run_seed_command()

        for like in Like.objects.select_related("post"):
            reward = RewardTransaction.objects.get(
                activity_type="like",
                reference_id=like.pk,
            )

            self.assertEqual(
                reward.user_id,
                like.post.author_id,
            )

            self.assertEqual(reward.points, 2)

    def test_interaction_reward_totals(self):
        self.run_seed_command()

        comment_points = (
            RewardTransaction.objects.filter(
                activity_type="comment"
            ).aggregate(
                total=Sum("points")
            )["total"]
        )

        like_points = (
            RewardTransaction.objects.filter(
                activity_type="like"
            ).aggregate(
                total=Sum("points")
            )["total"]
        )

        self.assertEqual(comment_points, 150)
        self.assertEqual(like_points, 100)

    def test_real_users_and_posts_are_excluded(self):
        real_user = User.objects.create_user(
            username="real_neighbor",
            email="neighbor@example.com",
            password="SecurePassword123!",
        )

        real_post = Post.objects.create(
            author=real_user,
            content="A real community post.",
        )

        self.run_seed_command()

        self.assertFalse(
            Comment.objects.filter(
                user=real_user
            ).exists()
        )

        self.assertFalse(
            Like.objects.filter(
                user=real_user
            ).exists()
        )

        self.assertFalse(
            Comment.objects.filter(
                post=real_post
            ).exists()
        )

        self.assertFalse(
            Like.objects.filter(
                post=real_post
            ).exists()
        )

        self.assertFalse(
            RewardTransaction.objects.filter(
                user=real_user
            ).exists()
        )

    def test_interaction_timestamps_are_valid(self):
        self.run_seed_command()

        now = timezone.now()

        for model in (Comment, Like):
            interactions = model.objects.select_related(
                "post",
                "user",
            )

            for interaction in interactions:
                self.assertGreaterEqual(
                    interaction.created_at,
                    interaction.post.created_at,
                )

                self.assertGreaterEqual(
                    interaction.created_at,
                    interaction.user.date_joined,
                )

                self.assertLessEqual(
                    interaction.created_at,
                    now,
                )

    def test_dry_run_does_not_save_changes(self):
        transactions_before = (
            RewardTransaction.objects.count()
        )

        milestones_before = (
            UserMilestone.objects.count()
        )

        profiles_before = list(
            UserRewardProfile.objects.order_by(
                "pk"
            ).values_list(
                "pk",
                "total_points",
                "available_points",
            )
        )

        self.run_seed_command(
            dry_run=True,
        )

        self.assertEqual(
            Comment.objects.count(),
            0,
        )

        self.assertEqual(
            Like.objects.count(),
            0,
        )

        self.assertEqual(
            RewardTransaction.objects.count(),
            transactions_before,
        )

        self.assertEqual(
            UserMilestone.objects.count(),
            milestones_before,
        )

        self.assertEqual(
            list(
                UserRewardProfile.objects.order_by(
                    "pk"
                ).values_list(
                    "pk",
                    "total_points",
                    "available_points",
                )
            ),
            profiles_before,
        )

    def test_invalid_comment_count(self):
        with self.assertRaises(CommandError):
            self.run_seed_command(
                comments=-1,
            )

    def test_invalid_like_count(self):
        with self.assertRaises(CommandError):
            self.run_seed_command(
                likes=-1,
            )

    def test_excessive_likes_roll_back_comments(self):
        with self.assertRaises(CommandError):
            self.run_seed_command(
                comments=30,
                likes=1000,
            )

        self.assertEqual(
            Comment.objects.count(),
            0,
        )

        self.assertEqual(
            Like.objects.count(),
            0,
        )

    @patch(
        "community.management.commands."
        "seed_interactions.award_activity_points"
    )
    def test_reward_failure_rolls_back_activity(
        self,
        mock_award,
    ):
        mock_award.side_effect = RuntimeError(
            "Reward processing failed."
        )

        with self.assertRaises(RuntimeError):
            self.run_seed_command()

        self.assertEqual(
            Comment.objects.count(),
            0,
        )

        self.assertEqual(
            Like.objects.count(),
            0,
        )