import random
import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from community.models import Post
from community.management.post_content import generate_post_content
from rewards.models import RewardMilestone
from rewards.services import award_activity_points


User = get_user_model()

DEMO_POST_PATTERN = re.compile(
    r"\[Demo post #(\d{5})\]\Z"
)


class Command(BaseCommand):
    help = "Generate fictional neighborhood community posts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=1000,
            help="Target number of fictional posts.",
        )

        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Number of days across which posts are distributed.",
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        days = options["days"]
        dry_run = options["dry_run"]

        if not 1 <= count <= 10000:
            raise CommandError(
                "Post count must be between 1 and 10,000."
            )

        if not 1 <= days <= 365:
            raise CommandError(
                "Days must be between 1 and 365."
            )

        # Find eligible fictional accounts.
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

        if not demo_users:
            raise CommandError(
                "No fictional users found. "
                "Run python manage.py seed_users first."
            )

        if not RewardMilestone.objects.filter(
            is_active=True
        ).exists():
            raise CommandError(
                "No active reward milestones found. "
                "Run python manage.py seed_milestones first."
            )

        # Separate random generators for content and authors.
        content_rng = random.Random(42)
        activity_rng = random.Random(84)

        now = timezone.now()

        created_count = 0
        skipped_count = 0
        rewards_count = 0

        # Give some fictional users higher activity levels.
        user_weights = [
            activity_rng.randint(1, 10)
            for _ in demo_users
        ]

        # Load existing identifiers once instead of querying
        # the database separately for every generated post.
        existing_ids = set()

        existing_posts = Post.objects.filter(
            author__in=demo_users,
            content__contains="[Demo post #",
        ).values_list("content", flat=True)

        for content in existing_posts.iterator():
            match = DEMO_POST_PATTERN.search(content)

            if match:
                post_index = int(match.group(1))

                if post_index in existing_ids:
                    raise CommandError(
                        f"Duplicate demo post ID: {post_index}"
                    )

                existing_ids.add(post_index)

        self.stdout.write("Seeding fictional community posts...")
        self.stdout.write("-" * 50)

        self.stdout.write(
            f"Available fictional users: {len(demo_users)}"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN: No changes will be saved."
                )
            )

        for index in range(1, count + 1):
            content = generate_post_content(
                index,
                content_rng,
            )

            author = activity_rng.choices(
                population=demo_users,
                weights=user_weights,
                k=1,
            )[0]

            seconds_ago = activity_rng.randint(
                0,
                days * 24 * 60 * 60,
            )

            created_at = max(
                now - timedelta(seconds=seconds_ago),
                author.date_joined,
            )

            if index in existing_ids:
                skipped_count += 1
                continue

            post = Post.objects.create(
                author=author,
                content=content,
            )

            # auto_now_add and auto_now require a separate
            # update when assigning historical timestamps.
            Post.objects.filter(pk=post.pk).update(
                created_at=created_at,
                updated_at=created_at,
            )

            _, reward_created = award_activity_points(
                user=author,
                activity_type="post",
                reference_id=post.pk,
            )

            created_count += 1

            if reward_created:
                rewards_count += 1

            if created_count % 100 == 0:
                self.stdout.write(
                    f"Created {created_count} posts..."
                )

        if dry_run:
            transaction.set_rollback(True)

        self.stdout.write("-" * 50)

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run completed!")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "Fictional post seeding completed!"
                )
            )

        self.stdout.write(f"Requested posts: {count}")
        self.stdout.write(f"Created posts: {created_count}")
        self.stdout.write(f"Skipped posts: {skipped_count}")
        self.stdout.write(
            f"Post reward transactions created: {rewards_count}"
        )