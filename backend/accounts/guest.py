GUEST_USERNAME = "guest"
GUEST_EMAIL = "guest@neighborhood-rewards.example"


def is_guest_user(user):
    return (
        user.is_authenticated
        and user.username == GUEST_USERNAME
        and user.email == GUEST_EMAIL
        and not user.has_usable_password()
        and not user.is_staff
        and not user.is_superuser
    )