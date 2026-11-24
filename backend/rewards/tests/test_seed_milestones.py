
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from rewards.models import RewardMilestone, UserMilestone


class SeedMilestonesCommandTests(TestCase):

    def run_command(self):
        output = StringIO()

        call_command(
            "seed_milestones",
            stdout=output,
        )

        return output.getvalue()

    def test_command_creates_five_milestones(self):
        self.run_command()

        self.assertEqual(
            RewardMilestone.objects.count(),
            5,
        )

    def test_command_creates_correct_milestone_values(self):
        self.run_command()

        expected = {
            "First Steps": ("posts", 1, 25),
            "Community Contributor": ("posts", 10, 50),
            "Helpful Neighbor": ("comments", 25, 75),
            "Neighborhood Favorite": ("likes", 50, 100),
            "Community Champion": ("points", 1000, 200),
        }

        for name, values in expected.items():
            with self.subTest(milestone=name):
                milestone = RewardMilestone.objects.get(
                    name=name
                )

                self.assertEqual(
                    (
                        milestone.milestone_type,
                        milestone.required_count,
                        milestone.bonus_points,
                    ),
                    values,
                )

                self.assertTrue(milestone.is_active)

    def test_command_is_idempotent(self):
        self.run_command()

        original_ids = set(
            RewardMilestone.objects.values_list(
                "id",
                flat=True,
            )
        )

        self.run_command()

        current_ids = set(
            RewardMilestone.objects.values_list(
                "id",
                flat=True,
            )
        )

        self.assertEqual(
            RewardMilestone.objects.count(),
            5,
        )

        self.assertEqual(original_ids, current_ids)

    def test_command_updates_existing_milestone(self):
        milestone = RewardMilestone.objects.create(
            name="First Steps",
            description="Old description",
            milestone_type="posts",
            required_count=5,
            bonus_points=10,
        )

        self.run_command()

        milestone.refresh_from_db()

        self.assertEqual(
            milestone.description,
            "Create your first community post.",
        )
        self.assertEqual(milestone.required_count, 1)
        self.assertEqual(milestone.bonus_points, 25)

    def test_command_preserves_inactive_milestone(self):
        self.run_command()

        milestone = RewardMilestone.objects.get(
            name="First Steps"
        )

        milestone.is_active = False
        milestone.save(update_fields=["is_active"])

        self.run_command()

        milestone.refresh_from_db()

        self.assertFalse(milestone.is_active)

    def test_command_preserves_user_achievements(self):
        self.run_command()

        user = get_user_model().objects.create_user(
            username="test_neighbor",
        )

        milestone = RewardMilestone.objects.get(
            name="First Steps"
        )

        achievement = UserMilestone.objects.create(
            user=user,
            milestone=milestone,
        )

        self.run_command()

        self.assertTrue(
            UserMilestone.objects.filter(
                pk=achievement.pk,
                user=user,
                milestone=milestone,
            ).exists()
        )

    def test_duplicate_milestones_trigger_rollback(self):
        for _ in range(2):
            RewardMilestone.objects.create(
                name="Community Champion",
                description="Duplicate milestone",
                milestone_type="points",
                required_count=1000,
                bonus_points=200,
            )

        with self.assertRaises(CommandError):
            self.run_command()

        self.assertEqual(
            RewardMilestone.objects.count(),
            2,
        )

        self.assertFalse(
            RewardMilestone.objects.filter(
                name="First Steps"
            ).exists()
        )

    def test_command_reports_success(self):
        output = self.run_command()

        self.assertIn(
            "Milestone seeding completed successfully!",
            output,
        )

        self.assertIn("Created: 5", output)
        self.assertIn("Updated: 0", output)
