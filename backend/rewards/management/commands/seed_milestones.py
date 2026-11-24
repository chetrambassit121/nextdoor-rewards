from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from rewards.models import RewardMilestone


MILESTONES = [
    {
        "name": "First Steps",
        "description": "Create your first community post.",
        "milestone_type": RewardMilestone.MilestoneType.POSTS,
        "required_count": 1,
        "bonus_points": 25,
    },
    {
        "name": "Community Contributor",
        "description": "Create 10 community posts.",
        "milestone_type": RewardMilestone.MilestoneType.POSTS,
        "required_count": 10,
        "bonus_points": 50,
    },
    {
        "name": "Helpful Neighbor",
        "description": "Write 25 comments.",
        "milestone_type": RewardMilestone.MilestoneType.COMMENTS,
        "required_count": 25,
        "bonus_points": 75,
    },
    {
        "name": "Neighborhood Favorite",
        "description": "Receive 50 likes.",
        "milestone_type": RewardMilestone.MilestoneType.LIKES,
        "required_count": 50,
        "bonus_points": 100,
    },
    {
        "name": "Community Champion",
        "description": "Earn 1,000 base activity points.",
        "milestone_type": RewardMilestone.MilestoneType.POINTS,
        "required_count": 1000,
        "bonus_points": 200,
    },
]


class Command(BaseCommand):
    help = "Initialize the default Neighborhood Rewards milestones."

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        self.stdout.write("Seeding reward milestones...")
        self.stdout.write("-" * 45)

        for data in MILESTONES:
            name = data["name"]

            if RewardMilestone.objects.filter(name=name).count() > 1:
                raise CommandError(
                    f"Duplicate milestone definitions found: {name}"
                )

            milestone, created = (
                RewardMilestone.objects.update_or_create(
                    name=name,
                    defaults={
                        "description": data["description"],
                        "milestone_type": data["milestone_type"],
                        "required_count": data["required_count"],
                        "bonus_points": data["bonus_points"],
                    },
                )
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created: {milestone.name}"
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    f"Updated: {milestone.name}"
                )

        self.stdout.write("-" * 45)

        self.stdout.write(
            self.style.SUCCESS(
                "Milestone seeding completed successfully!"
            )
        )

        self.stdout.write(f"Created: {created_count}")
        self.stdout.write(f"Updated: {updated_count}")
        self.stdout.write(
            f"Total milestones: "
            f"{RewardMilestone.objects.count()}"
        )