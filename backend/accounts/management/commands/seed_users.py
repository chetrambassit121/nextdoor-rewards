import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from rewards.models import UserRewardProfile


User = get_user_model()


FIRST_NAMES = [
    "Olivia", "James", "Sophia", "Daniel", "Emma",
    "Michael", "Isabella", "David", "Mia", "Ethan",
    "Charlotte", "Alexander", "Amelia", "Benjamin",
    "Harper", "Lucas", "Evelyn", "Henry", "Abigail",
    "Sebastian", "Priya", "Arjun", "Aisha", "Omar",
    "Elena", "Carlos", "Mei", "Noah", "Sofia", "Liam",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown",
    "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson",
    "Martin", "Lee", "Perez", "Thompson",
    "Patel", "Sharma", "Chen", "Kim",
    "Ahmed", "Ali", "Singh", "Nguyen",
    "Rivera", "Robinson",
]

DEMO_EMAIL_DOMAIN = "example.com"
DEMO_USERNAME_PREFIX = "demo_"


def generate_user_data(index, rng):
    """
    Generate a deterministic fictional user.
    """
    first_name = rng.choice(FIRST_NAMES)
    last_name = rng.choice(LAST_NAMES)

    username = (
        f"{DEMO_USERNAME_PREFIX}"
        f"{first_name.lower()}_"
        f"{last_name.lower()}_"
        f"{index:03d}"
    )

    return {
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "email": f"{username}@{DEMO_EMAIL_DOMAIN}",
    }


class Command(BaseCommand):
    help = "Generate fictional users for the neighborhood demo."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=100,
            help="Target number of fictional users.",
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        dry_run = options["dry_run"]

        if not 1 <= count <= 10000:
            raise CommandError(
                "User count must be between 1 and 10,000."
            )

        rng = random.Random(42)

        created_count = 0
        skipped_count = 0
        profile_count = 0

        self.stdout.write("Seeding fictional users...")
        self.stdout.write("-" * 45)

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN: No changes will be saved.")
            )

        for index in range(1, count + 1):
            data = generate_user_data(index, rng)

            existing_user = User.objects.filter(
                username__iexact=data["username"]
            ).first()

            if existing_user:
                skipped_count += 1

                self.stdout.write(
                    f"Skipped existing user: {data['username']}"
                )
                continue

            if User.objects.filter(
                email__iexact=data["email"]
            ).exists():
                raise CommandError(
                    f"Email already exists: {data['email']}"
                )

            user = User.objects.create_user(
                username=data["username"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                password=None,
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )

            _, profile_created = (
                UserRewardProfile.objects.get_or_create(
                    user=user
                )
            )

            created_count += 1

            if profile_created:
                profile_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"Created: {user.username}"
                )
            )

        if dry_run:
            transaction.set_rollback(True)

        self.stdout.write("-" * 45)

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run completed!")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "Fictional user seeding completed!"
                )
            )

        self.stdout.write(f"Requested: {count}")
        self.stdout.write(f"Created: {created_count}")
        self.stdout.write(f"Skipped: {skipped_count}")
        self.stdout.write(f"Reward profiles created: {profile_count}")