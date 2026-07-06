#!/bin/bash
# გამოყენება:
#   ./scripts/migrate.sh upgrade        — ბოლო ვერსიამდე
#   ./scripts/migrate.sh downgrade -1   — ერთი უკან
#   ./scripts/migrate.sh history        — ისტორია
#   ./scripts/migrate.sh current        — მიმდინარე ვერსია

docker compose exec appointments alembic $@
