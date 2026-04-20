from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import Role, Semester, User, Base
from app.db.session import engine
from app.core import security
from app.core.logging import logger

async def init_db(db: AsyncSession):
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")

    # Initialize Roles
    role_map = {}
    roles = ["Admin", "Professor", "Student"]
    for role_name in roles:
        result = await db.execute(select(Role).where(Role.name == role_name))
        role = result.scalars().first()
        if not role:
            role = Role(name=role_name)
            db.add(role)
            await db.flush() # To get the ID
        role_map[role_name] = role
    
    # Initialize Semesters (e.g., S1 to S10 with Year 1-5)
    for i in range(1, 11):
        year = (i + 1) // 2
        result = await db.execute(select(Semester).where(Semester.number == i))
        semester = result.scalars().first()
        if not semester:
            db.add(Semester(number=i, year=year))
        elif semester.year != year:
            semester.year = year
            
    # Initialize some default Subjects for testing
    default_subjects = [
        {"name": "Analyse Mathématique", "semester": 1},
        {"name": "Algorithmique & C", "semester": 1},
        {"name": "Réseaux Informatiques", "semester": 3},
        {"name": "Intelligence Artificielle", "semester": 6},
    ]
    from app.models.models import Subject
    for subj in default_subjects:
        res = await db.execute(select(Semester).where(Semester.number == subj["semester"]))
        sem = res.scalars().first()
        if sem:
            res_subj = await db.execute(select(Subject).where(Subject.name == subj["name"], Subject.semester_id == sem.id))
            if not res_subj.scalars().first():
                db.add(Subject(name=subj["name"], semester_id=sem.id))
            
    # Initialize Test Users
    test_users = [
        {"email": "admin@emsi.ma", "password": "Admin123!", "role": "Admin"},
        {"email": "student@emsi.ma", "password": "Student123!", "role": "Student"},
        {"email": "prof@emsi.ma", "password": "Prof123!", "role": "Professor"},
    ]
    
    # Initialize Test Users
    test_users = [
        {"email": "admin@emsi.ma", "password": "Admin123!", "role": "Admin"},
        {"email": "student@emsi.ma", "password": "Student123!", "role": "Student"},
        {"email": "prof@emsi.ma", "password": "Prof123!", "role": "Professor"},
    ]
    
    for user_data in test_users:
        logger.info(f"Forcing synchronization for test user: {user_data['email']}")
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        user = result.scalars().first()
        
        # We MUST use the latest hash logic
        # This will overwrite any old/corrupted hashes in the DB
        hashed_password = security.hash_password(user_data["password"])
        
        if not user:
            new_user = User(
                email=user_data["email"],
                password_hash=hashed_password,
                role_id=role_map[user_data["role"]].id
            )
            db.add(new_user)
            logger.info(f"Created new test user: {user_data['email']}")
        else:
            # Force update to ensure hash integrity and schema upgrade
            user.password_hash = hashed_password
            user.role_id = role_map[user_data["role"]].id
            logger.info(f"Reset password hash for existing user: {user_data['email']}")
            
    await db.commit()
    logger.info("Database user reset completed successfully.")
