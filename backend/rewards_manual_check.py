from django.contrib.auth import get_user_model
from community.models import Post
from rewards.models import UserRewardProfile
from rewards.services import award_activity_points

User = get_user_model()

# 1. Create or retrieve test user
user, _ = User.objects.get_or_create(
    username="rewards_demo_user"
)

# 2. Create community post
post = Post.objects.create(
    author=user,
    content="Hello neighbors! This is my first reward test."
)

print("Post ID:", post.id)

# 3. Award activity points
reward, created = award_activity_points(
    user=user,
    activity_type="post",
    reference_id=post.id,
)

print("Created:", created)
print("Activity points:", reward.points)

# 4. Retrieve reward profile
profile = UserRewardProfile.objects.get(user=user)

print("Total points:", profile.total_points)
print("Available points:", profile.available_points)