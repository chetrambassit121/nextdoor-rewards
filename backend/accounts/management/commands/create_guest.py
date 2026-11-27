
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.guest import (
    GUEST_USERNAME,
    GUEST_EMAIL,
    is_guest_user,
)
from rewards.models import UserRewardProfile


User = get_user_model()


class Command(BaseCommand):
    help = "Create the dedicated Neighborhood Rewards guest account."

    @transaction.atomic
    def handle(self, *args, **options):
        guest = User.objects.filter(
            username__iexact=GUEST_USERNAME
        ).first()

        if guest is not None:
            if not is_guest_user(guest) or not guest.is_active:
                raise CommandError(
                    "An incompatible guest account already exists."
                )

            created = False

        else:
            if User.objects.filter(
                email__iexact=GUEST_EMAIL
            ).exists():
                raise CommandError(
                    "Guest email is already in use."
                )

            guest = User.objects.create_user(
                username=GUEST_USERNAME,
                email=GUEST_EMAIL,
                first_name="Guest",
                last_name="Visitor",
                password=None,
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )

            created = True

        _, profile_created = (
            UserRewardProfile.objects.get_or_create(
                user=guest
            )
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS("Guest account created.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("Guest account already exists.")
            )

        self.stdout.write(f"Username: {guest.username}")
        self.stdout.write(f"User ID: {guest.pk}")
        self.stdout.write(
            f"Reward profile created: {profile_created}"
        )
        self.stdout.write(
            f"Usable password: {guest.has_usable_password()}"
        )
