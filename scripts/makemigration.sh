#!/bin/bash
# გამოყენება: ./scripts/makemigration.sh "add_waitlist_table"
if [ -z "$1" ]; then
  echo "გამოყენება: ./scripts/makemigration.sh <სახელი>"
  exit 1
fi
docker compose exec appointments alembic revision --autogenerate -m "$1"
