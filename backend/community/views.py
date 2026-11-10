from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response

from .models import Post, Comment, Like
from .serializers import PostSerializer, CommentSerializer


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return (
            Post.objects
            .select_related("author")
            .annotate(
                comments_total=Count("comments", distinct=True),
                likes_total=Count("likes", distinct=True),
            )
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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
        serializer.save(user=request.user, post=post)

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

        if request.method == "POST":
            if post.author_id == request.user.id:
                return Response(
                    {"detail": "You cannot like your own post."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            like, created = Like.objects.get_or_create(
                user=request.user,
                post=post,
            )

            if not created:
                return Response(
                    {"detail": "You already liked this post."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"detail": "Post liked successfully."},
                status=status.HTTP_201_CREATED,
            )

        deleted_count, _ = Like.objects.filter(
            user=request.user,
            post=post,
        ).delete()

        if deleted_count == 0:
            return Response(
                {"detail": "You have not liked this post."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

