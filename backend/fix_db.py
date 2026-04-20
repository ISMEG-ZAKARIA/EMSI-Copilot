import asyncio
import os
import sys

# Add the parent directory to the path so we can import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.session import engine
from app.core.logging import logger

async def run_migration():
    async with engine.begin() as conn:
        logger.info("Starting manual migration to fix missing columns...")
        
        # 1. Add description to courses if missing
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN description TEXT AFTER name"))
            logger.info("Added description column to courses")
        except Exception as e:
            if "Duplicate column name" in str(e):
                logger.info("Description column already exists in courses")
            else:
                logger.error(f"Error adding description column: {e}")

        # 2. Add subject_id to courses if missing
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN subject_id INT AFTER semester_id"))
            logger.info("Added subject_id column to courses")
        except Exception as e:
            if "Duplicate column name" in str(e):
                logger.info("subject_id column already exists in courses")
            else:
                logger.error(f"Error adding subject_id column: {e}")

        # 3. Create subjects table if missing
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subjects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    semester_id INT,
                    FOREIGN KEY (semester_id) REFERENCES semesters(id)
                )
            """))
            logger.info("Ensured subjects table exists")
        except Exception as e:
            logger.error(f"Error creating subjects table: {e}")

        # 4. Add foreign key constraint for subject_id if not exists
        try:
            # Check if constraint exists (MySQL specific)
            result = await conn.execute(text("""
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'courses' 
                AND CONSTRAINT_NAME = 'fk_course_subject'
            """))
            if not result.fetchone():
                await conn.execute(text("ALTER TABLE courses ADD CONSTRAINT fk_course_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)"))
                logger.info("Added foreign key constraint fk_course_subject to courses")
        except Exception as e:
            logger.error(f"Error adding foreign key constraint: {e}")

        # 5. Add year to semesters if missing
        try:
            await conn.execute(text("ALTER TABLE semesters ADD COLUMN year INT NOT NULL DEFAULT 1"))
            logger.info("Added year column to semesters")
        except Exception as e:
            if "Duplicate column name" in str(e):
                logger.info("Year column already exists in semesters")
            else:
                logger.error(f"Error adding year column: {e}")

        # 6. Add is_active to users if missing
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN is_active INT DEFAULT 1"))
            logger.info("Added is_active column to users")
        except Exception as e:
            if "Duplicate column name" in str(e):
                logger.info("is_active column already exists in users")
            else:
                logger.error(f"Error adding is_active column: {e}")

        logger.info("Migration completed.")

if __name__ == "__main__":
    asyncio.run(run_migration())
