#!/usr/bin/env bash
set -o errexit

python -m pip install -r requirements.txt
python manage.py collectstatic --no-input --settings=config.settings_production
python manage.py migrate --noinput --settings=config.settings_production
