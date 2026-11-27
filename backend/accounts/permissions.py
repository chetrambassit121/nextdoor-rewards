
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .guest import GUEST_USERNAME


class GuestReadOnly(BasePermission):
    """
    Allow guest users to explore the application,
    but prevent them from modifying application data.
    """

    message = (
        "Guest accounts have read-only access. "
        "Please register an account to perform this action."
    )

    code = "guest_read_only"

    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return True

        if user.username.casefold() == GUEST_USERNAME.casefold():
            return request.method in SAFE_METHODS

        return True
