from django.conf import settings
from django.http import HttpResponse
from django.views import View


class ReactAppView(View):
    def get(self, request, *args, **kwargs):
        index_file = (
            settings.BASE_DIR
            / "frontend_dist"
            / "index.html"
        )

        if not index_file.is_file():
            return HttpResponse(
                "React production build not found.",
                status=503,
            )

        return HttpResponse(
            index_file.read_text(encoding="utf-8"),
            content_type="text/html",
        )