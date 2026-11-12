from django.db import transaction
from django.db.models import Count, Exists, OuterRef

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response

from rewards.services import award_activity_points

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


    def destroy(self, request, *args, **kwargs):
        post = self.get_object()

        if post.author_id != request.user.id:
            return Response(
                {"detail": "You can only delete your own posts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)

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

        # DELETE: Temporarily disable unlike
        return Response(
            {
                "detail": (
                    "Removing likes is temporarily unavailable "
                    "until reward reversal support is implemented."
                )
            },
            status=status.HTTP_409_CONFLICT,
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

