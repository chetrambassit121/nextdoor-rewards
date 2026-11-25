from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Seed the complete fictional Neighborhood Rewards demo database."

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=100)
        parser.add_argument("--posts", type=int, default=1000)
        parser.add_argument("--comments", type=int, default=2500)
        parser.add_argument("--likes", type=int, default=5000)
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Run the complete seed and roll back all changes.",
        )

    def handle(self, *args, **options):
        limits = {
            "users": (1, 10000),
            "posts": (1, 10000),
            "comments": (0, 50000),
            "likes": (0, 100000),
            "days": (1, 365),
        }
        for key, (minimum, maximum) in limits.items():
            value = options[key]
            if not minimum <= value <= maximum:
                raise CommandError(
                    f"--{key} must be between {minimum} and {maximum}."
                )

        # With the supplied seed generators, likes require distinct
        # non-author user/post pairs. Check the requested scale early.
        max_likes = options["posts"] * (options["users"] - 1)
        if options["likes"] > max_likes:
            raise CommandError(
                f"Requested {options['likes']} likes, but at most "
                f"{max_likes} unique non-author pairs are possible "
                "with these user and post targets."
            )
        if options["users"] < 2:
            raise CommandError("At least 2 fictional users are required for interactions.")

        self.stdout.write("Starting complete Neighborhood Rewards demo seed...")
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("DRY RUN: all changes will be rolled back."))

        steps = [
            ("Reward milestones", "seed_milestones", {}),
            ("Fictional users", "seed_users", {"count": options["users"]}),
            ("Community posts", "seed_posts", {
                "count": options["posts"], "days": options["days"],
            }),
            ("Comments and likes", "seed_interactions", {
                "comments": options["comments"], "likes": options["likes"],
            }),
        ]

        # Important: do not pass dry_run to child commands. Each child
        # has its own atomic rollback, which would hide its generated
        # records from the subsequent child command.
        with transaction.atomic():
            for number, (label, command, kwargs) in enumerate(steps, start=1):
                self.stdout.write(f"\n[{number}/{len(steps)}] {label}")
                try:
                    call_command(command, stdout=self.stdout, stderr=self.stderr, **kwargs)
                except Exception as exc:
                    raise CommandError(
                        f"Seeding failed during '{command}'; "
                        f"all changes rolled back: {exc}"
                    ) from exc
            if options["dry_run"]:
                transaction.set_rollback(True)

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(
                "Dry run succeeded. No changes were committed."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "Complete demo seed finished successfully."
            ))
