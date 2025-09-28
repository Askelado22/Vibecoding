from django.views.generic import TemplateView


class AppView(TemplateView):
    template_name = 'frontend/index.html'
