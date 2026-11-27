from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count

from community.models import Comment, Like
from community.management.commands.seed_interactions import (
    Command as InteractionSeeder, DEMO_COMMENT_PATTERN,
)
from core.management.commands.repair_demo_activity import Command as ActivityRepair
from rewards.models import RewardTransaction, RewardMilestone
from rewards.services import reverse_activity_points, POINT_RULES


class Command(BaseCommand):
    help = 'Replace existing fictional engagement using weighted seed rules.'

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group(required=True)
        mode.add_argument('--dry-run', action='store_true')
        mode.add_argument('--apply', action='store_true')

    @transaction.atomic
    def handle(self, *args, **options):
        helper = ActivityRepair()
        users = helper.get_demo_users()
        posts = helper.get_demo_posts(users)
        if len(users) < 2 or not posts:
            raise CommandError('At least two demo users and one demo post required.')
        if not RewardMilestone.objects.filter(is_active=True).exists():
            raise CommandError('No active reward milestones.')
        scope = dict(user__in=users, post__in=posts)
        candidates = Comment.objects.filter(**scope).order_by('pk')
        comments = [c for c in candidates if DEMO_COMMENT_PATTERN.search(c.content)]
        likes = list(Like.objects.filter(**scope).select_related('post').order_by('pk'))
        if not comments and not likes:
            raise CommandError('No demo interactions to repair.')
        # The seeder uses consecutive marker IDs. Reject ambiguous datasets.
        ids = sorted(int(DEMO_COMMENT_PATTERN.search(c.content).group(1)) for c in comments)
        if ids != list(range(1, len(comments) + 1)):
            raise CommandError('Demo comment markers are not consecutive and unique.')
        if len(comments) > 50000 or len(likes) > 100000:
            raise CommandError('Dataset exceeds supported seed limits.')
        if len(likes) > len(posts) * (len(users) - 1):
            raise CommandError('Too many likes for non-self unique pairs.')
        # Refuse ambiguous or inconsistent reward ownership before changing data.
        for kind, rows in [('comment', comments), ('like', likes)]:
            for row in rows:
                recipient = row.user_id if kind == 'comment' else row.post.author_id
                original = RewardTransaction.objects.filter(idempotency_key=f'{kind}:{row.pk}:create').first()
                if (original is None or original.user_id != recipient
                        or original.activity_type != kind or original.reference_id != row.pk
                        or original.points != POINT_RULES[kind]
                        or RewardTransaction.objects.filter(idempotency_key=f'{kind}:{row.pk}:reverse').exists()):
                    raise CommandError(f'Unexpected reward history for {kind} {row.pk}; repair aborted.')
        self.stdout.write(f'Comments to replace: {len(comments)}; likes to replace: {len(likes)}')
        for kind, rows, model in [('comment', comments, Comment), ('like', likes, Like)]:
            for row in rows:
                _, created = reverse_activity_points(kind, row.pk)
                if not created:
                    raise CommandError('Reward reversal failed.')
            model.objects.filter(pk__in=[row.pk for row in rows]).delete()
        seeder = InteractionSeeder(stdout=self.stdout)
        if seeder.seed_comments(users, posts, len(comments)) != len(comments):
            raise CommandError('Comment replacement count mismatch.')
        if seeder.seed_likes(users, posts, len(likes)) != len(likes):
            raise CommandError('Like replacement count mismatch.')
        for label, model in [('Comments', Comment), ('Likes', Like)]:
            counts = list(model.objects.filter(**scope).values('post_id').annotate(n=Count('pk')).values_list('n', flat=True))
            self.stdout.write(f'{label}: {len(counts)} engaged posts; maximum per post: {max(counts, default=0)}')
        if options['dry_run']:
            transaction.set_rollback(True)
            self.stdout.write('Dry run completed. No changes saved.')
        else:
            self.stdout.write(self.style.SUCCESS('Demo engagement repaired.'))
