import asyncio
from app.db.session import engine
from sqlalchemy import text

async def fix():
    async with engine.begin() as conn:
        await conn.execute(text('UPDATE semesters SET year = 1 WHERE number IN (1, 2)'))
        await conn.execute(text('UPDATE semesters SET year = 2 WHERE number IN (3, 4)'))
        await conn.execute(text('UPDATE semesters SET year = 3 WHERE number IN (5, 6)'))
        await conn.execute(text('UPDATE semesters SET year = 4 WHERE number IN (7, 8)'))
        await conn.execute(text('UPDATE semesters SET year = 5 WHERE number IN (9, 10)'))
        print('Semesters updated successfully')

if __name__ == "__main__":
    asyncio.run(fix())
