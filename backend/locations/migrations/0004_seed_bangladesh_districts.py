from django.db import migrations


# District names, divisions, and coordinates are based on the CC BY 4.0
# Open Admin Data Bangladesh administrative divisions dataset:
# https://github.com/open-admin-data/bangladesh-administrative-divisions
DISTRICTS = (
    ("Barguna", "barguna", "barishal", "22.128000", "90.110000"),
    ("Barishal", "barishal", "barishal", "22.819000", "90.369000"),
    ("Bhola", "bhola", "barishal", "22.310000", "90.764000"),
    ("Jhalokati", "jhalokati", "barishal", "22.572000", "90.182000"),
    ("Patuakhali", "patuakhali", "barishal", "22.165000", "90.407000"),
    ("Pirojpur", "pirojpur", "barishal", "22.532000", "89.992000"),
    ("Bandarban", "bandarban", "chattogram", "21.805000", "92.365000"),
    ("Brahmanbaria", "brahmanbaria", "chattogram", "23.953000", "91.083000"),
    ("Chandpur", "chandpur", "chattogram", "23.261000", "90.749000"),
    ("Chattogram", "chattogram", "chattogram", "22.447000", "91.819000"),
    ("Cumilla", "cumilla", "chattogram", "23.437000", "91.033000"),
    ("Cox's Bazar", "coxs-bazar", "chattogram", "21.476000", "92.063000"),
    ("Feni", "feni", "chattogram", "22.995000", "91.412000"),
    ("Khagrachhari", "khagrachhari", "chattogram", "23.172000", "91.956000"),
    ("Lakshmipur", "lakshmipur", "chattogram", "22.851000", "90.854000"),
    ("Noakhali", "noakhali", "chattogram", "22.658000", "91.129000"),
    ("Rangamati", "rangamati", "chattogram", "22.825000", "92.281000"),
    ("Dhaka", "dhaka", "dhaka", "23.788000", "90.251000"),
    ("Faridpur", "faridpur", "dhaka", "23.478000", "89.836000"),
    ("Gazipur", "gazipur", "dhaka", "24.099000", "90.446000"),
    ("Gopalganj", "gopalganj", "dhaka", "23.105000", "89.899000"),
    ("Kishoreganj", "kishoreganj", "dhaka", "24.378000", "90.943000"),
    ("Madaripur", "madaripur", "dhaka", "23.222000", "90.166000"),
    ("Manikganj", "manikganj", "dhaka", "23.841000", "89.951000"),
    ("Munshiganj", "munshiganj", "dhaka", "23.526000", "90.416000"),
    ("Narayanganj", "narayanganj", "dhaka", "23.724000", "90.578000"),
    ("Narsingdi", "narsingdi", "dhaka", "24.003000", "90.774000"),
    ("Rajbari", "rajbari", "dhaka", "23.729000", "89.561000"),
    ("Shariatpur", "shariatpur", "dhaka", "23.245000", "90.415000"),
    ("Tangail", "tangail", "dhaka", "24.358000", "90.000000"),
    ("Bagerhat", "bagerhat", "khulna", "22.329000", "89.744000"),
    ("Chuadanga", "chuadanga", "khulna", "23.609000", "88.849000"),
    ("Jashore", "jashore", "khulna", "23.089000", "89.175000"),
    ("Jhenaidah", "jhenaidah", "khulna", "23.488000", "89.087000"),
    ("Khulna", "khulna", "khulna", "22.366000", "89.453000"),
    ("Kushtia", "kushtia", "khulna", "23.926000", "89.018000"),
    ("Magura", "magura", "khulna", "23.444000", "89.433000"),
    ("Meherpur", "meherpur", "khulna", "23.794000", "88.707000"),
    ("Narail", "narail", "khulna", "23.131000", "89.578000"),
    ("Satkhira", "satkhira", "khulna", "22.308000", "89.143000"),
    ("Jamalpur", "jamalpur", "mymensingh", "24.977000", "89.847000"),
    ("Mymensingh", "mymensingh", "mymensingh", "24.699000", "90.430000"),
    ("Netrakona", "netrakona", "mymensingh", "24.871000", "90.845000"),
    ("Sherpur", "sherpur", "mymensingh", "25.083000", "90.075000"),
    ("Bogura", "bogura", "rajshahi", "24.824000", "89.380000"),
    ("Joypurhat", "joypurhat", "rajshahi", "25.093000", "89.084000"),
    ("Naogaon", "naogaon", "rajshahi", "24.900000", "88.752000"),
    ("Natore", "natore", "rajshahi", "24.381000", "89.087000"),
    ("Chapainawabganj", "chapainawabganj", "rajshahi", "24.716000", "88.264000"),
    ("Pabna", "pabna", "rajshahi", "24.053000", "89.386000"),
    ("Rajshahi", "rajshahi", "rajshahi", "24.468000", "88.651000"),
    ("Sirajganj", "sirajganj", "rajshahi", "24.392000", "89.601000"),
    ("Dinajpur", "dinajpur", "rangpur", "25.630000", "88.786000"),
    ("Gaibandha", "gaibandha", "rangpur", "25.298000", "89.505000"),
    ("Kurigram", "kurigram", "rangpur", "25.790000", "89.695000"),
    ("Lalmonirhat", "lalmonirhat", "rangpur", "26.063000", "89.237000"),
    ("Nilphamari", "nilphamari", "rangpur", "26.026000", "88.930000"),
    ("Panchagarh", "panchagarh", "rangpur", "26.285000", "88.579000"),
    ("Rangpur", "rangpur", "rangpur", "25.651000", "89.237000"),
    ("Thakurgaon", "thakurgaon", "rangpur", "25.990000", "88.345000"),
    ("Habiganj", "habiganj", "sylhet", "24.369000", "91.432000"),
    ("Moulvibazar", "moulvibazar", "sylhet", "24.481000", "91.916000"),
    ("Sunamganj", "sunamganj", "sylhet", "24.940000", "91.346000"),
    ("Sylhet", "sylhet", "sylhet", "24.920000", "91.988000"),
)


def seed_bangladesh_districts(apps, schema_editor):
    District = apps.get_model("locations", "District")

    for name, slug, division, latitude, longitude in DISTRICTS:
        District.objects.update_or_create(
            name=name,
            defaults={
                "slug": slug,
                "division": division,
                "latitude": latitude,
                "longitude": longitude,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("locations", "0003_hotspot"),
    ]

    operations = [
        migrations.RunPython(
            seed_bangladesh_districts,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
