from rewards.models import RewardMilestone

milestones = [
    {
        "name": "First Steps",
        "description": "Create your first community post.",
        "milestone_type": "posts",
        "required_count": 1,
        "bonus_points": 25,
    },
    {
        "name": "Community Contributor",
        "description": "Create 10 community posts.",
        "milestone_type": "posts",
        "required_count": 10,
        "bonus_points": 50,
    },
    {
        "name": "Helpful Neighbor",
        "description": "Write 25 comments.",
        "milestone_type": "comments",
        "required_count": 25,
        "bonus_points": 75,
    },
    {
        "name": "Neighborhood Favorite",
        "description": "Receive 50 likes.",
        "milestone_type": "likes",
        "required_count": 50,
        "bonus_points": 100,
    },
    {
        "name": "Community Champion",
        "description": "Earn 1,000 base activity points.",
        "milestone_type": "points",
        "required_count": 1000,
        "bonus_points": 200,
    },
]

for data in milestones:
    name = data["name"]

    milestone, created = RewardMilestone.objects.update_or_create(
        name=name,
        defaults={
            "description": data["description"],
            "milestone_type": data["milestone_type"],
            "required_count": data["required_count"],
            "bonus_points": data["bonus_points"],
        },
    )

    action = "Created" if created else "Updated"
    print(f"{action}: {milestone.name}")

print("Milestone seeding completed!")