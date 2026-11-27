import random
import heapq
import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from community.models import Post, Comment, Like
from community.management.comment_content import (
    generate_comment_content,
)
from community.management.commands.seed_posts import (
    DEMO_POST_PATTERN,
)

from rewards.models import RewardMilestone
from rewards.services import award_activity_points


User = get_user_model()


DEMO_COMMENT_PATTERN = re.compile(
    r"\[Demo comment #(\d{5})\]\Z"
)


class Command(BaseCommand):
    help = "Generate fictional community comments and likes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--comments",
            type=int,
            default=2500,
            help="Target number of fictional comments.",
        )

        parser.add_argument(
            "--likes",
            type=int,
            default=5000,
            help="Target number of fictional likes.",
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving them.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        comment_count = options["comments"]
        like_count = options["likes"]
        dry_run = options["dry_run"]

        if not 0 <= comment_count <= 50000:
            raise CommandError(
                "Comments must be between 0 and 50,000."
            )

        if not 0 <= like_count <= 100000:
            raise CommandError(
                "Likes must be between 0 and 100,000."
            )

        candidates = User.objects.filter(
            username__startswith="demo_",
            email__endswith="@example.com",
            is_active=True,
            is_staff=False,
            is_superuser=False,
        ).order_by("username")

        demo_users = [
            user
            for user in candidates
            if not user.has_usable_password()
            and user.email == f"{user.username}@example.com"
        ]

        if len(demo_users) < 2:
            raise CommandError(
                "At least two fictional users are required. "
                "Run seed_users first."
            )

        if not RewardMilestone.objects.filter(
            is_active=True
        ).exists():
            raise CommandError(
                "No active reward milestones found. "
                "Run seed_milestones first."
            )

        candidates = Post.objects.filter(
            author__in=demo_users,
            content__contains="[Demo post #",
        ).select_related("author").order_by("pk")

        demo_posts = [
            post
            for post in candidates
            if DEMO_POST_PATTERN.search(post.content)
        ]

        if not demo_posts:
            raise CommandError(
                "No fictional posts found. "
                "Run seed_posts first."
            )

        self.stdout.write(
            "Seeding fictional community interactions..."
        )

        self.stdout.write("-" * 50)

        self.stdout.write(
            f"Available fictional users: {len(demo_users)}"
        )

        self.stdout.write(
            f"Available fictional posts: {len(demo_posts)}"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN: No changes will be saved."
                )
            )

        comments_created = self.seed_comments(
            demo_users,
            demo_posts,
            comment_count,
        )

        likes_created = self.seed_likes(
            demo_users,
            demo_posts,
            like_count,
        )

        if dry_run:
            transaction.set_rollback(True)

        self.stdout.write("-" * 50)

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run completed!"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "Fictional interactions completed!"
                )
            )

        self.stdout.write(
            f"Requested comments: {comment_count}"
        )

        self.stdout.write(
            f"Created comments: {comments_created}"
        )

        self.stdout.write(
            f"Requested likes: {like_count}"
        )

        self.stdout.write(
            f"Created likes: {likes_created}"
        )

    def generate_timestamp(self, post, user, rng):
        now = timezone.now()

        earliest = max(
            post.created_at,
            user.date_joined,
        )

        available_seconds = max(
            0,
            int((now - earliest).total_seconds()),
        )

        return earliest + timedelta(
            seconds=rng.randint(0, available_seconds)
        )

    @staticmethod
    def engagement_weights(posts):
        """Stable popularity tiers: 15% popular, 35% active, 50% quiet.

        Ranking by seeded post identity avoids shifting popularity when the
        command is rerun with a larger target.
        """
        ranked = sorted(posts, key=lambda post: random.Random(post.pk * 7919).random())
        total = len(ranked)
        popular = max(1, round(total * 0.15))
        active = round(total * 0.35)
        return {
            post.pk: (12.0 if index < popular else 3.0 if index < popular + active else 0.35)
            for index, post in enumerate(ranked)
        }

    @staticmethod
    def commenter_weights(users):
        """Some neighbors participate more often than others."""
        return {
            user.pk: 0.5 + 4.5 * random.Random(user.pk * 3571).random() ** 2
            for user in users
        }

    def seed_comments(self, users, posts, count):
        rng = random.Random(126)

        existing_ids = set()

        existing_comments = Comment.objects.filter(
            user__in=users,
            post__in=posts,
            content__contains="[Demo comment #",
        ).values_list("content", flat=True)

        for content in existing_comments.iterator():
            match = DEMO_COMMENT_PATTERN.search(content)

            if match:
                index = int(match.group(1))

                if index in existing_ids:
                    raise CommandError(
                        f"Duplicate demo comment ID: {index}"
                    )

                existing_ids.add(index)

        eligible_users = {
            post.pk: [
                user
                for user in users
                if user.pk != post.author_id
            ]
            for post in posts
        }

        created_count = 0
        popularity = self.engagement_weights(posts)
        participation = self.commenter_weights(users)
        post_weights = [popularity[post.pk] for post in posts]

        for index in range(1, count + 1):
            post = rng.choices(posts, weights=post_weights, k=1)[0]
            eligible = eligible_users[post.pk]
            user = rng.choices(
                eligible,
                weights=[participation[item.pk] for item in eligible],
                k=1,
            )[0]

            content = generate_comment_content(
                index,
                post.content,
                rng,
            )

            created_at = self.generate_timestamp(
                post,
                user,
                rng,
            )

            if index in existing_ids:
                continue

            comment = Comment.objects.create(
                user=user,
                post=post,
                content=content,
            )

            Comment.objects.filter(
                pk=comment.pk
            ).update(
                created_at=created_at,
            )

            award_activity_points(
                user=user,
                activity_type="comment",
                reference_id=comment.pk,
            )

            created_count += 1

            if created_count % 250 == 0:
                self.stdout.write(
                    f"Created {created_count} comments..."
                )

        return created_count

    def seed_likes(self, users, posts, count):
        rng = random.Random(168)

        existing_pairs = set(
            Like.objects.filter(
                user__in=users,
                post__in=posts,
            ).values_list(
                "user_id",
                "post_id",
            )
        )

        user_map = {
            user.pk: user
            for user in users
        }

        post_map = {
            post.pk: post
            for post in posts
        }

        available_pairs = [
            (user.pk, post.pk)
            for post in posts
            for user in users
            if user.pk != post.author_id
            and (user.pk, post.pk) not in existing_pairs
        ]

        remaining_count = max(
            0,
            count - len(existing_pairs),
        )

        if remaining_count > len(available_pairs):
            raise CommandError(
                "Requested likes exceed the number "
                "of available unique user/post pairs."
            )

        # Weighted sampling *without replacement* keeps likes unique,
        # while making popular posts and active neighbors more visible.
        # A seeded random stream makes repeated runs reproducible.
        popularity = self.engagement_weights(posts)
        participation = self.commenter_weights(users)
        selected_pairs = heapq.nlargest(
            remaining_count,
            available_pairs,
            key=lambda pair: (
                rng.random() ** (
                    1.0 / (
                        popularity[pair[1]] * participation[pair[0]]
                    ))
            ),
        )

        created_count = 0

        for user_id, post_id in selected_pairs:
            user = user_map[user_id]
            post = post_map[post_id]

            like, created = Like.objects.get_or_create(
                user=user,
                post=post,
            )

            if not created:
                continue

            created_at = self.generate_timestamp(
                post,
                user,
                rng,
            )

            Like.objects.filter(
                pk=like.pk
            ).update(
                created_at=created_at,
            )

            award_activity_points(
                user=post.author,
                activity_type="like",
                reference_id=like.pk,
            )

            created_count += 1

            if created_count % 250 == 0:
                self.stdout.write(
                    f"Created {created_count} likes..."
                )

        return created_count