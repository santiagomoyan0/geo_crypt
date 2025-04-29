from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
