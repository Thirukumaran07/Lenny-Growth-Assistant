#!/usr/bin/env bash
set -e

echo "[backend] Starting Lenny Growth Assistant container entrypoint..."

# Wait for PostgreSQL to be ready if DATABASE_URL contains a host
if [ -n "$DATABASE_URL" ]; then
    echo "[backend] Checking database connection..."
    python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from backend.app.config import get_settings

async def check():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    for _ in range(30):
        try:
            async with engine.connect() as conn:
                print('[backend] PostgreSQL is ready and reachable.')
                await engine.dispose()
                return
        except Exception as e:
            print(f'[backend] Waiting for PostgreSQL: {e}')
            await asyncio.sleep(1)
    print('[backend] WARNING: PostgreSQL not immediately reachable, proceeding with startup.')

asyncio.run(check())
"
fi

echo "[backend] Running database migrations (alembic upgrade head)..."
alembic upgrade head || echo "[backend] Alembic migration reported existing or initial state."

echo "[backend] Launching FastAPI service via uvicorn..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --lifespan on
