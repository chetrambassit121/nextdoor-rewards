from django.db import transaction
from django.db.models import Count, Exists, OuterRef

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response

from rewards.services import (
    award_activity_points,
    reverse_activity_points,
)

from .models import Post, Comment, Like
from .serializers import PostSerializer, CommentSerializer



class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        queryset = (
            Post.objects
            .select_related("author")
            .annotate(
                comments_total=Count("comments", distinct=True),
                likes_total=Count("likes", distinct=True),
            )
        )

        if self.request.user.is_authenticated:
            queryset = queryset.annotate(
                user_has_liked=Exists(
                    Like.objects.filter(
                        post_id=OuterRef("pk"),
                        user=self.request.user,
                    )
                )
            )

        return queryset.order_by("-created_at")

    
    @transaction.atomic
    def perform_create(self, serializer):
        post = serializer.save(
            author=self.request.user
        )

        award_activity_points(
            user=self.request.user,
            activity_type="post",
            reference_id=post.pk,
        )


   
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        post = self.get_object()

        if post.author_id != request.user.id:
            return Response(
                {
                    "detail": "You can only delete your own posts."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Reverse rewards for comments on this post.
        for comment_id in post.comments.values_list(
            "pk", flat=True
        ).iterator():
            reverse_activity_points(
                activity_type="comment",
                reference_id=comment_id,
            )

        # Reverse rewards for likes received.
        for like_id in post.likes.values_list(
            "pk", flat=True
        ).iterator():
            reverse_activity_points(
                activity_type="like",
                reference_id=like_id,
            )

        # Reverse the post author's creation reward.
        reverse_activity_points(
            activity_type="post",
            reference_id=post.pk,
        )

        # Django cascades deletion to comments and likes.
        post.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[IsAuthenticatedOrReadOnly],
    )
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method == "GET":
            comments = (
                post.comments
                .select_related("user")
                .order_by("-created_at")
            )
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)

        if post.author_id == request.user.id:
            return Response(
                {"detail": "You cannot comment on your own post."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            comment = serializer.save(
                user=request.user,
                post=post,
            )

            award_activity_points(
                user=request.user,
                activity_type="comment",
                reference_id=comment.pk,
            )


            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
        )

    
    @action(
        detail=True,
        methods=["delete"],
        url_path=r"comments/(?P<comment_id>[0-9]+)",
        permission_classes=[IsAuthenticated],
    )
    def delete_comment(
        self, request, pk=None, comment_id=None
    ):
        post = self.get_object()

        comment = Comment.objects.filter(
            pk=comment_id,
            post=post,
        ).first()

        if comment is None:
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if comment.user_id != request.user.id:
            return Response(
                {
                    "detail": "You can only delete your own comments."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            reverse_activity_points(
                activity_type="comment",
                reference_id=comment.pk,
            )

            comment.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


    @action(
        detail=True,
        methods=["post", "delete"],
        permission_classes=[IsAuthenticated],
    )
    def like(self, request, pk=None):
        post = self.get_object()

        # POST: Like another user's post
        if request.method == "POST":

            if post.author_id == request.user.id:
                return Response(
                    {"detail": "You cannot like your own post."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                like, created = Like.objects.get_or_create(
                    user=request.user,
                    post=post,
                )

                if not created:
                    return Response(
                        {"detail": "You already liked this post."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Award points to the POST AUTHOR
                # because their post received a like.
                award_activity_points(
                    user=post.author,
                    activity_type="like",
                    reference_id=like.pk,
                )

            return Response(
                {"detail": "Post liked successfully."},
                status=status.HTTP_201_CREATED,
            )

       
        # DELETE: Unlike a post and reverse the reward.
        with transaction.atomic():
            like = Like.objects.filter(
                user=request.user,
                post=post,
            ).first()

            if like is None:
                return Response(
                    {"detail": "You have not liked this post."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            reverse_activity_points(
                activity_type="like",
                reference_id=like.pk,
            )

            like.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        post = self.get_queryset().get(
            pk=serializer.instance.pk
        )

        response_serializer = self.get_serializer(post)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

