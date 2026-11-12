
from django.contrib import admin

from .models import (
    UserRewardProfile,
    RewardTransaction,
    RewardMilestone,
    UserMilestone,
)


@admin.register(UserRewardProfile)
class UserRewardProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "total_points",
        "available_points",
        "updated_at",
    )
    search_fields = ("user__username",)


@admin.register(RewardTransaction)
class RewardTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "activity_type",
        "points",
        "created_at",
    )
    list_filter = ("activity_type",)
    search_fields = ("user__username", "idempotency_key")


@admin.register(RewardMilestone)
class RewardMilestoneAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "milestone_type",
        "required_count",
        "bonus_points",
        "is_active",
    )
    list_filter = ("milestone_type", "is_active")


@admin.register(UserMilestone)
class UserMilestoneAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "milestone",
        "achieved_at",
    )
    search_fields = ("user__username", "milestone__name")

