from django.core.management.base import BaseCommand
from django.utils.text import slugify

from locations.models import District


DISTRICTS = [
    # Barishal Division
    ("Barguna", "barishal", 22.161020, 90.120020),
    ("Barishal", "barishal", 22.701320, 90.352770),
    ("Bhola", "barishal", 22.685920, 90.648180),
    ("Jhalakathi", "barishal", 22.641940, 90.198020),
    ("Patuakhali", "barishal", 22.359630, 90.329870),
    ("Pirojpur", "barishal", 22.598770, 89.978460),

    # Chattogram Division
    ("Bandarban", "chattogram", 22.195330, 92.218380),
    ("Brahmanbaria", "chattogram", 23.957090, 91.111930),
    ("Chandpur", "chattogram", 23.233260, 90.671290),
    ("Chattogram", "chattogram", 22.335110, 91.834070),
    ("Cumilla", "chattogram", 23.468270, 91.178810),
    ("Cox's Bazar", "chattogram", 21.583330, 92.016670),
    ("Feni", "chattogram", 23.023230, 91.384080),
    ("Khagrachhari", "chattogram", 23.119290, 91.984660),
    ("Lakshmipur", "chattogram", 22.942480, 90.841180),
    ("Noakhali", "chattogram", 22.869560, 91.099400),
    ("Rangamati", "chattogram", 22.633330, 92.200000),

    # Dhaka Division
    ("Dhaka", "dhaka", 23.711530, 90.411150),
    ("Faridpur", "dhaka", 23.607080, 89.842940),
    ("Gazipur", "dhaka", 24.002290, 90.426430),
    ("Gopalganj", "dhaka", 23.005090, 89.826610),
    ("Kishoreganj", "dhaka", 24.444940, 90.776580),
    ("Madaripur", "dhaka", 23.164100, 90.189680),
    ("Manikganj", "dhaka", 23.866510, 90.002710),
    ("Munshiganj", "dhaka", 23.542150, 90.529730),
    ("Narayanganj", "dhaka", 23.633660, 90.496480),
    ("Narsingdi", "dhaka", 23.932230, 90.715410),
    ("Rajbari", "dhaka", 23.757430, 89.644470),
    ("Shariatpur", "dhaka", 23.229270, 90.335130),
    ("Tangail", "dhaka", 24.252390, 89.916040),

    # Khulna Division
    ("Bagerhat", "khulna", 22.651570, 89.785940),
    ("Chuadanga", "khulna", 23.640200, 88.841840),
    ("Jashore", "khulna", 23.166430, 89.208110),
    ("Jhenaidah", "khulna", 23.544820, 89.153920),
    ("Khulna", "khulna", 22.815770, 89.568680),
    ("Kushtia", "khulna", 23.901260, 89.120480),
    ("Magura", "khulna", 23.487340, 89.419960),
    ("Meherpur", "khulna", 23.762210, 88.631820),
    ("Narail", "khulna", 23.172530, 89.512670),
    ("Satkhira", "khulna", 22.708170, 89.071850),

    # Mymensingh Division
    ("Jamalpur", "mymensingh", 24.937530, 89.937780),
    ("Mymensingh", "mymensingh", 24.747990, 90.416580),
    ("Netrokona", "mymensingh", 24.870960, 90.727890),
    ("Sherpur", "mymensingh", 25.020490, 90.015300),

    # Rajshahi Division
    ("Bogura", "rajshahi", 24.846520, 89.377760),
    ("Chapainawabganj", "rajshahi", 24.596500, 88.277510),
    ("Joypurhat", "rajshahi", 25.105100, 89.028880),
    ("Naogaon", "rajshahi", 24.804180, 88.948750),
    ("Natore", "rajshahi", 24.420560, 89.000280),
    ("Pabna", "rajshahi", 23.998520, 89.233650),
    ("Rajshahi", "rajshahi", 24.374180, 88.601160),
    ("Sirajganj", "rajshahi", 24.453400, 89.700680),

    # Rangpur Division
    ("Dinajpur", "rangpur", 25.621710, 88.635450),
    ("Gaibandha", "rangpur", 25.328750, 89.528090),
    ("Kurigram", "rangpur", 25.805450, 89.636170),
    ("Lalmonirhat", "rangpur", 25.920160, 89.439980),
    ("Nilphamari", "rangpur", 25.931790, 88.856010),
    ("Panchagarh", "rangpur", 26.341100, 88.554160),
    ("Rangpur", "rangpur", 25.755810, 89.244460),
    ("Thakurgaon", "rangpur", 26.033690, 88.461680),

    # Sylhet Division
    ("Habiganj", "sylhet", 24.374950, 91.415530),
    ("Moulvibazar", "sylhet", 24.482930, 91.777420),
    ("Sunamganj", "sylhet", 25.065800, 91.395010),
    ("Sylhet", "sylhet", 24.889800, 91.869790),
]


class Command(BaseCommand):
    help = "Seed Bangladesh's 64 districts with map coordinates."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for name, division, latitude, longitude in DISTRICTS:
            _, created = District.objects.update_or_create(
                name=name,
                defaults={
                    "slug": slugify(name),
                    "division": division,
                    "latitude": latitude,
                    "longitude": longitude,
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        total_count = District.objects.count()

        self.stdout.write(
            self.style.SUCCESS(
                f"District seeding completed: "
                f"{created_count} created, "
                f"{updated_count} updated, "
                f"{total_count} total."
            )
        )

        if total_count != 64:
            self.stdout.write(
                self.style.WARNING(
                    f"Warning: Expected 64 districts, found {total_count}."
                )
            )