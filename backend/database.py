from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import Config

# Create SQLAlchemy engine
# If using sqlite, add connect_args to avoid thread sharing issues
if Config.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        Config.DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(Config.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
