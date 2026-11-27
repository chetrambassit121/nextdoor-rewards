from io import StringIO
from django.core.management import call_command
from django.test import TestCase
from community.models import Comment, Like
from rewards.models import RewardTransaction


class RepairDemoEngagementTests(TestCase):
    def setUp(self):
        for command, options in [('seed_milestones', {}), ('seed_users', {'count': 10}), ('seed_posts', {'count': 30}), ('seed_interactions', {'comments': 60, 'likes': 80})]:
            call_command(command, stdout=StringIO(), **options)

    def snapshot(self):
        return [list(model.objects.order_by('pk').values()) for model in (Comment, Like, RewardTransaction)]

    def test_dry_run(self):
        before = self.snapshot()
        call_command('repair_demo_engagement', dry_run=True, stdout=StringIO())
        self.assertEqual(before, self.snapshot())

    def test_apply_preserves_counts(self):
        call_command('repair_demo_engagement', apply=True, stdout=StringIO())
        self.assertEqual(Comment.objects.count(), 60)
        self.assertEqual(Like.objects.count(), 80)
        self.assertEqual(RewardTransaction.objects.filter(activity_type='reversal').count(), 140)
