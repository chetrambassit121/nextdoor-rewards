from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from accounts.management.commands.seed_users import generate_user_data
from django.contrib.auth import get_user_model
from community.models import Post, Comment, Like
from rewards.models import RewardMilestone


class SeedDemoTests(TestCase):
    def test_invalid_counts_do_not_write(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo", users=1, posts=2, comments=0, likes=0)
        self.assertEqual(RewardMilestone.objects.count(), 0)

    def test_dry_run_rolls_back_all_steps(self):
        call_command(
            "seed_demo", users=2, posts=2, comments=2, likes=2,
            dry_run=True, stdout=StringIO(),
        )
        self.assertEqual(get_user_model().objects.count(), 0)
        self.assertEqual(RewardMilestone.objects.count(), 0)
        self.assertEqual(Post.objects.count(), 0)
        self.assertEqual(Comment.objects.count(), 0)
        self.assertEqual(Like.objects.count(), 0)

    def test_seed_is_rerunnable(self):
        kwargs = dict(users=2, posts=2, comments=2, likes=2, stdout=StringIO())
        call_command("seed_demo", **kwargs)
        counts = (
            get_user_model().objects.count(), Post.objects.count(),
            Comment.objects.count(), Like.objects.count(),
        )
        call_command("seed_demo", **kwargs)
        self.assertEqual(counts, (
            get_user_model().objects.count(), Post.objects.count(),
            Comment.objects.count(), Like.objects.count(),
        ))
        self.assertEqual(counts, (2, 2, 2, 2))

    def test_failure_rolls_back_earlier_steps(self):
        from django.core.management import call_command as original

        def fail_on_posts(name, *args, **kwargs):
            if name == "seed_posts":
                raise CommandError("simulated failure")
            return original(name, *args, **kwargs)

        with patch(
            "core.management.commands.seed_demo.call_command",
            side_effect=fail_on_posts,
        ):
            with self.assertRaises(CommandError):
                call_command(
                    "seed_demo", users=2, posts=2, comments=0, likes=0,
                    stdout=StringIO(),
                )
        self.assertEqual(get_user_model().objects.count(), 0)
        self.assertEqual(RewardMilestone.objects.count(), 0)
