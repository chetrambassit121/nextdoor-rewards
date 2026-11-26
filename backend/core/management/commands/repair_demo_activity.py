
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from community.models import Post, Comment, Like

from community.management.commands.seed_posts import (
    DEMO_POST_PATTERN,
)

from community.management.commands.seed_interactions import (
    DEMO_COMMENT_PATTERN,
)


User = get_user_model()


class Command(BaseCommand):
    help = "Repair historical timestamps for existing demo activity."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Number of days across which posts are distributed.",
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving them.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]

        if not 1 <= days <= 365:
            raise CommandError(
                "Days must be between 1 and 365."
            )

        now = timezone.now()

        user_rng = random.Random(64)
        post_rng = random.Random(84)
        comment_rng = random.Random(126)
        like_rng = random.Random(168)

        self.stdout.write("Repairing fictional community activity...")
        self.stdout.write("-" * 50)

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN: No changes will be saved."
                )
            )

        # Identify fictional users.
        users = self.get_demo_users()

        if not users:
            raise CommandError(
                "No fictional users found."
            )

        user_map = {
            user.pk: user
            for user in users
        }

        # Identify fictional posts.
        posts = self.get_demo_posts(users)

        if not posts:
            raise CommandError(
                "No fictional posts found."
            )

        post_map = {
            post.pk: post
            for post in posts
        }

        # Repair timestamps in memory.
        self.repair_users(
            users, now, days, user_rng
        )

        self.repair_posts(
            posts, user_map, now, days, post_rng
        )

        comments = self.repair_comments(
            user_map, post_map, now, comment_rng
        )

        likes = self.repair_likes(
            user_map, post_map, now, like_rng
        )

        # Save only when not running in preview mode.
        if not dry_run:
            User.objects.bulk_update(
                users,
                ["date_joined"],
                batch_size=500,
            )

            Post.objects.bulk_update(
                posts,
                ["created_at", "updated_at"],
                batch_size=500,
            )

            Comment.objects.bulk_update(
                comments,
                ["created_at"],
                batch_size=500,
            )

            Like.objects.bulk_update(
                likes,
                ["created_at"],
                batch_size=500,
            )

        self.print_summary(
            users, posts, comments, likes, dry_run
        )

    def get_demo_users(self):
        candidates = User.objects.filter(
            username__startswith="demo_",
            email__endswith="@example.com",
            is_active=True,
            is_staff=False,
            is_superuser=False,
        ).order_by("username")

        return [
            user
            for user in candidates
            if not user.has_usable_password()
            and user.email == f"{user.username}@example.com"
        ]

    def get_demo_posts(self, users):
        candidates = Post.objects.filter(
            author__in=users,
            content__contains="[Demo post #",
        ).order_by("pk")

        return [
            post
            for post in candidates
            if DEMO_POST_PATTERN.search(post.content)
        ]

    def repair_users(self, users, now, days, rng):
        minimum_age = max(180, days + 1)

        for user in users:
            proposed_date = now - timedelta(
                days=rng.randint(minimum_age, 730),
                seconds=rng.randint(0, 86400),
            )

            # Never move an existing registration forward.
            user.date_joined = min(
                user.date_joined,
                proposed_date,
            )

    def repair_posts(self, posts, user_map, now, days, rng):
        # Assign unique historical timestamps.
        offsets = rng.sample(
            range(days * 86400),
            len(posts),
        )

        for post, offset in zip(posts, offsets):
            author = user_map[post.author_id]

            created_at = max(
                now - timedelta(seconds=offset),
                author.date_joined,
            )

            # Never move a post forward in time.
            # This protects existing genuine interactions.
            post.created_at = min(
                post.created_at,
                created_at,
            )

            post.updated_at = max(
                post.created_at,
                min(post.updated_at, now),
            )

    def generate_interaction_timestamp(
        self, post, user, original_date, now, rng
    ):
        earliest = max(
            post.created_at,
            user.date_joined,
        )

        latest = min(original_date, now)

        if earliest > latest:
            raise CommandError(
                "Invalid interaction timestamp detected."
            )

        available_seconds = int(
            (latest - earliest).total_seconds()
        )

        return earliest + timedelta(
            seconds=rng.randint(
                0,
                available_seconds,
            )
        )

    def repair_comments(self, user_map, post_map, now, rng):
        candidates = Comment.objects.filter(
            user_id__in=user_map.keys(),
            post_id__in=post_map.keys(),
            content__contains="[Demo comment #",
        ).order_by("pk")

        comments = []

        for comment in candidates:
            if not DEMO_COMMENT_PATTERN.search(
                comment.content
            ):
                continue

            comment.created_at = (
                self.generate_interaction_timestamp(
                    post_map[comment.post_id],
                    user_map[comment.user_id],
                    comment.created_at,
                    now,
                    rng,
                )
            )

            comments.append(comment)

        return comments

    def repair_likes(self, user_map, post_map, now, rng):
        likes = list(
            Like.objects.filter(
                user_id__in=user_map.keys(),
                post_id__in=post_map.keys(),
            ).order_by("pk")
        )

        for like in likes:
            like.created_at = (
                self.generate_interaction_timestamp(
                    post_map[like.post_id],
                    user_map[like.user_id],
                    like.created_at,
                    now,
                    rng,
                )
            )

        return likes

    def print_summary(
        self, users, posts, comments, likes, dry_run
    ):
        latest_posts = sorted(
            posts,
            key=lambda post: (post.created_at, post.pk),
            reverse=True,
        )[:10]

        unique_authors = len({
            post.author_id
            for post in latest_posts
        })

        unique_timestamps = len({
            post.created_at
            for post in posts
        })

        self.stdout.write("-" * 50)

        self.stdout.write(f"Users processed: {len(users)}")
        self.stdout.write(f"Posts processed: {len(posts)}")
        self.stdout.write(f"Comments processed: {len(comments)}")
        self.stdout.write(f"Likes processed: {len(likes)}")

        self.stdout.write(
            f"Unique post timestamps: {unique_timestamps}"
        )

        self.stdout.write(
            f"Unique authors in latest 10 posts: {unique_authors}"
        )

        self.stdout.write(
            "Reward balances and transactions unchanged."
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run completed. No changes saved."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "Demo activity repair completed!"
                )
            )
