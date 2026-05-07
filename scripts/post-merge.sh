#!/bin/bash
set -e
pnpm install --frozen-lockfile

if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
  pnpm --filter @workspace/db run push
fi
