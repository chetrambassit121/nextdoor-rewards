from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from rewards.models import (
    UserRewardProfile,
    RewardTransaction,
    UserMilestone,
)


User = get_user_model()


class SeedUsersCommandTests(TestCase):

    def run_seed_command(self, count=10, **kwargs):
        output = StringIO()

        call_command(
            "seed_users",
            count=count,
            stdout=output,
            **kwargs,
        )

        return output.getvalue()

    def get_demo_users(self):
        return User.objects.filter(
            username__startswith="demo_",
            email__endswith="@example.com",
        )

    def test_creates_requested_number_of_users(self):
        self.run_seed_command(count=10)

        self.assertEqual(
            self.get_demo_users().count(),
            10,
        )

    def test_creates_unique_usernames_and_emails(self):
        self.run_seed_command(count=10)

        users = self.get_demo_users()

        usernames = set(
            users.values_list("username", flat=True)
        )

        emails = set(
            users.values_list("email", flat=True)
        )

        self.assertEqual(len(usernames), 10)
        self.assertEqual(len(emails), 10)

    def test_creates_reward_profiles(self):
        self.run_seed_command(count=10)

        profiles = UserRewardProfile.objects.filter(
            user__in=self.get_demo_users()
        )

        self.assertEqual(profiles.count(), 10)

    def test_reward_profiles_start_with_zero_points(self):
        self.run_seed_command(count=5)

        profiles = UserRewardProfile.objects.filter(
            user__in=self.get_demo_users()
        )

        for profile in profiles:
            self.assertEqual(profile.total_points, 0)
            self.assertEqual(profile.available_points, 0)

    def test_command_is_idempotent(self):
        self.run_seed_command(count=10)
        self.run_seed_command(count=10)

        self.assertEqual(
            self.get_demo_users().count(),
            10,
        )

    def test_increasing_count_creates_additional_users(self):
        self.run_seed_command(count=5)
        self.run_seed_command(count=10)

        self.assertEqual(
            self.get_demo_users().count(),
            10,
        )

    def test_demo_users_cannot_authenticate_with_password(self):
        self.run_seed_command(count=5)

        for user in self.get_demo_users():
            self.assertFalse(user.has_usable_password())

    def test_demo_users_have_no_admin_privileges(self):
        self.run_seed_command(count=5)

        for user in self.get_demo_users():
            self.assertFalse(user.is_staff)
            self.assertFalse(user.is_superuser)

    def test_existing_real_user_is_not_modified(self):
        real_user = User.objects.create_user(
            username="real_neighbor",
            email="neighbor@example.org",
            password="SecurePassword123!",
            first_name="Real",
            last_name="Neighbor",
        )

        original_password = real_user.password

        self.run_seed_command(count=5)

        real_user.refresh_from_db()

        self.assertEqual(real_user.username, "real_neighbor")
        self.assertEqual(real_user.first_name, "Real")
        self.assertEqual(real_user.last_name, "Neighbor")
        self.assertEqual(real_user.email, "neighbor@example.org")
        self.assertEqual(real_user.password, original_password)

    def test_dry_run_does_not_save_users(self):
        self.run_seed_command(
            count=10,
            dry_run=True,
        )

        self.assertEqual(
            self.get_demo_users().count(),
            0,
        )

        self.assertEqual(
            UserRewardProfile.objects.count(),
            0,
        )

    def test_invalid_count_raises_command_error(self):
        for count in [0, -1, 10001]:
            with self.subTest(count=count):
                with self.assertRaises(CommandError):
                    self.run_seed_command(count=count)

    def test_no_reward_transactions_or_milestones_created(self):
        self.run_seed_command(count=5)

        users = self.get_demo_users()

        self.assertFalse(
            RewardTransaction.objects.filter(
                user__in=users
            ).exists()
        )

        self.assertFalse(
            UserMilestone.objects.filter(
                user__in=users
            ).exists()
        )