from django.db import models


class District(models.Model):
    class Division(models.TextChoices):
        BARISHAL = "barishal", "Barishal"
        CHATTOGRAM = "chattogram", "Chattogram"
        DHAKA = "dhaka", "Dhaka"
        KHULNA = "khulna", "Khulna"
        MYMENSINGH = "mymensingh", "Mymensingh"
        RAJSHAHI = "rajshahi", "Rajshahi"
        RANGPUR = "rangpur", "Rangpur"
        SYLHET = "sylhet", "Sylhet"

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    division = models.CharField(
        max_length=20,
        choices=Division.choices,
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("division", "name")),
            models.Index(fields=("is_active",)),
        ]

    def __str__(self):
        return f"{self.name}, {self.get_division_display()}"