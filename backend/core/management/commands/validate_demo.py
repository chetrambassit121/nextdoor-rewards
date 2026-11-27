
from collections import Counter

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count, F
from django.utils import timezone

from community.models import Post, Comment, Like

from rewards.models import (
    UserRewardProfile,
    RewardTransaction,
    UserMilestone,
)

from rewards.services import POINT_RULES

from core.management.commands.repair_demo_activity import (
    Command as DemoActivityRepair,
)

from community.management.commands.seed_interactions import (
    DEMO_COMMENT_PATTERN,
)


User = get_user_model()


class Command(BaseCommand):
    help = "Validate demo data distribution and reward consistency."

    @transaction.atomic
    def handle(self, *args, **options):
        self.errors = []

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "\nNEIGHBORHOOD REWARDS — DATA VALIDATION"
            )
        )

        self.validate_counts()
        self.validate_distribution()
        self.validate_integrity()
        self.validate_timestamps()
        self.validate_activity_rewards()
        self.validate_reward_balances()
        self.validate_milestones()

        self.stdout.write("\n" + "=" * 60)

        if self.errors:
            for error in self.errors:
                self.stdout.write(
                    self.style.ERROR(error)
                )

            raise CommandError(
                f"Validation failed: {len(self.errors)} issues."
            )

        self.stdout.write(
            self.style.SUCCESS(
                "All implemented validation checks passed."
            )
        )

    def section(self, title):
        self.stdout.write(
            self.style.MIGRATE_HEADING(f"\n{title}")
        )
        self.stdout.write("-" * 60)

    def check_condition(self, condition, message):
        if condition:
            self.stdout.write(
                self.style.SUCCESS(f"PASS: {message}")
            )
        else:
            self.errors.append(message)
            self.stdout.write(
                self.style.ERROR(f"FAIL: {message}")
            )

    def validate_counts(self):
        self.section("1. Database Counts")

        models = {
            "Users": User,
            "Posts": Post,
            "Comments": Comment,
            "Likes": Like,
            "Reward profiles": UserRewardProfile,
            "Reward transactions": RewardTransaction,
            "Earned milestones": UserMilestone,
        }

        for label, model in models.items():
            self.stdout.write(
                f"{label}: {model.objects.count():,}"
            )

    def validate_distribution(self):
        self.section("2. Demo Activity Distribution")

        helper = DemoActivityRepair()

        users = helper.get_demo_users()
        posts = helper.get_demo_posts(users)

        user_ids = [user.pk for user in users]
        post_ids = [post.pk for post in posts]

        self.stdout.write(f"Demo users: {len(users)}")
        self.stdout.write(f"Demo posts: {len(posts)}")

        self.check_condition(bool(users), "Demo users exist")
        self.check_condition(bool(posts), "Demo posts exist")

        authors = Counter(
            post.author_id for post in posts
        )

        self.stdout.write(
            f"Unique post authors: {len(authors)}"
        )

        if authors:
            self.stdout.write(
                f"Maximum posts by one author: "
                f"{max(authors.values())}"
            )

        comments = Comment.objects.filter(
            user_id__in=user_ids,
            post_id__in=post_ids,
        )

        demo_comments = [
            comment for comment in comments
            if DEMO_COMMENT_PATTERN.search(comment.content)
        ]

        comment_counts = Counter(
            comment.post_id for comment in demo_comments
        )

        like_counts = Counter(
            Like.objects.filter(
                user_id__in=user_ids,
                post_id__in=post_ids,
            ).values_list("post_id", flat=True)
        )

        self.report_distribution(
            "Comments", post_ids, comment_counts
        )

        self.report_distribution(
            "Likes", post_ids, like_counts
        )

    def report_distribution(self, label, post_ids, counts):
        values = sorted(
            [counts.get(pk, 0) for pk in post_ids],
            reverse=True,
        )

        if not values:
            return

        total = sum(values)
        top_count = max(1, (len(values) + 9) // 10)

        concentration = (
            sum(values[:top_count]) / total * 100
            if total else 0
        )

        self.stdout.write(f"\n{label}:")
        self.stdout.write(f"  Total: {total:,}")
        self.stdout.write(f"  Minimum: {min(values)}")
        self.stdout.write(f"  Maximum: {max(values)}")
        self.stdout.write(
            f"  Average: {total / len(values):.2f}"
        )
        self.stdout.write(
            f"  Posts without engagement: {values.count(0)}"
        )
        self.stdout.write(
            f"  Top 10% share: {concentration:.2f}%"
        )

    def validate_integrity(self):
        self.section("3. Database Integrity")

        duplicate_likes = (
            Like.objects.values("user_id", "post_id")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
            .count()
        )

        duplicate_milestones = (
            UserMilestone.objects.values(
                "user_id", "milestone_id"
            )
            .annotate(total=Count("id"))
            .filter(total__gt=1)
            .count()
        )

        self_likes = Like.objects.filter(
            user_id=F("post__author_id")
        ).count()

        self.check_condition(
            duplicate_likes == 0,
            f"Duplicate like groups: {duplicate_likes}",
        )

        self.check_condition(
            duplicate_milestones == 0,
            f"Duplicate milestone groups: {duplicate_milestones}",
        )

        self.check_condition(
            self_likes == 0,
            f"Self-likes: {self_likes}",
        )

    def validate_timestamps(self):
        self.section("4. Timestamp Consistency")

        now = timezone.now()

        checks = {
            "Posts before author registration":
                Post.objects.filter(
                    created_at__lt=F("author__date_joined")
                ),

            "Comments before post creation":
                Comment.objects.filter(
                    created_at__lt=F("post__created_at")
                ),

            "Likes before post creation":
                Like.objects.filter(
                    created_at__lt=F("post__created_at")
                ),

            "Comments before user registration":
                Comment.objects.filter(
                    created_at__lt=F("user__date_joined")
                ),

            "Likes before user registration":
                Like.objects.filter(
                    created_at__lt=F("user__date_joined")
                ),

            "Future posts":
                Post.objects.filter(created_at__gt=now),

            "Future comments":
                Comment.objects.filter(created_at__gt=now),

            "Future likes":
                Like.objects.filter(created_at__gt=now),
        }

        for label, queryset in checks.items():
            count = queryset.count()

            self.check_condition(
                count == 0,
                f"{label}: {count}",
            )

    def validate_activity_rewards(self):
        self.section("5. Activity Reward Transactions")

        transactions = {
            reward.idempotency_key: reward
            for reward in RewardTransaction.objects.all()
        }

        activities = {
            "post": dict(
                Post.objects.values_list("pk", "author_id")
            ),
            "comment": dict(
                Comment.objects.values_list("pk", "user_id")
            ),
            "like": dict(
                Like.objects.exclude(
                    user_id=F("post__author_id")
                ).values_list("pk", "post__author_id")
            ),
        }

        missing = 0
        invalid = 0
        unreversed = 0

        for kind, records in activities.items():
            for reference_id, recipient_id in records.items():
                key = f"{kind}:{reference_id}:create"
                reward = transactions.get(key)

                if reward is None:
                    missing += 1
                    continue

                if (
                    reward.user_id != recipient_id
                    or reward.activity_type != kind
                    or reward.reference_id != reference_id
                    or reward.points != POINT_RULES[kind]
                    or f"{kind}:{reference_id}:reverse"
                    in transactions
                ):
                    invalid += 1

        for reward in transactions.values():
            kind = reward.activity_type

            if kind not in activities:
                continue

            if reward.reference_id not in activities[kind]:
                reversal = transactions.get(
                    f"{kind}:{reward.reference_id}:reverse"
                )

                if reversal is None:
                    unreversed += 1
                elif (
                    reversal.user_id != reward.user_id
                    or reversal.points != -reward.points
                    or reversal.activity_type != "reversal"
                    or reversal.reference_id != reward.reference_id
                ):
                    invalid += 1

        for reward in transactions.values():
            if reward.activity_type != "reversal":
                continue

            parts = reward.idempotency_key.split(":")

            if len(parts) != 3 or parts[2] != "reverse":
                invalid += 1
                continue

            original = transactions.get(
                f"{parts[0]}:{parts[1]}:create"
            )

            if (
                original is None
                or original.user_id != reward.user_id
                or original.points != -reward.points
                or original.reference_id != reward.reference_id
            ):
                invalid += 1

        self.check_condition(
            missing == 0,
            f"Missing activity rewards: {missing}",
        )

        self.check_condition(
            invalid == 0,
            f"Invalid reward transactions: {invalid}",
        )

        self.check_condition(
            unreversed == 0,
            f"Unreversed deleted activities: {unreversed}",
        )

    def validate_reward_balances(self):
        self.section("6. Reward Balance Consistency")

        ledger = Counter()

        for user_id, points in (
            RewardTransaction.objects.values_list(
                "user_id", "points"
            ).iterator()
        ):
            ledger[user_id] += points

        profiles = {
            profile.user_id: profile
            for profile in UserRewardProfile.objects.all()
        }

        mismatches = 0

        for user_id in set(ledger) | set(profiles):
            profile = profiles.get(user_id)
            expected = ledger.get(user_id, 0)

            if (
                profile is None
                or profile.total_points != expected
                or profile.available_points != expected
            ):
                mismatches += 1

                self.stdout.write(
                    f"Balance mismatch for user {user_id}: "
                    f"expected {expected}"
                )

        self.check_condition(
            mismatches == 0,
            f"Reward balance mismatches: {mismatches}",
        )

        self.stdout.write(
            f"Total net ledger points: {sum(ledger.values()):,}"
        )

    def validate_milestones(self):
        self.section("7. Milestone Reward Consistency")

        bonuses = {
            reward.idempotency_key: reward
            for reward in RewardTransaction.objects.filter(
                activity_type="milestone"
            )
        }

        invalid = 0
        achievement_keys = set()

        for achievement in (
            UserMilestone.objects.select_related("milestone")
        ):
            milestone = achievement.milestone

            key = (
                f"milestone:{achievement.user_id}:"
                f"{milestone.pk}"
            )

            achievement_keys.add(key)

            if milestone.bonus_points <= 0:
                continue

            reward = bonuses.get(key)

            if (
                reward is None
                or reward.user_id != achievement.user_id
                or reward.reference_id != milestone.pk
                or reward.points != milestone.bonus_points
            ):
                invalid += 1

        orphaned = set(bonuses) - achievement_keys

        self.check_condition(
            invalid == 0,
            f"Invalid milestone bonuses: {invalid}",
        )

        self.check_condition(
            not orphaned,
            f"Orphaned milestone bonuses: {len(orphaned)}",
        )
