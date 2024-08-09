from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    delete,
    exists,
    select,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from .app import DbExample as app

Base = declarative_base()
pgis_engine = app.get_persistent_store_database(app.DATABASE_NAME)
Session = sessionmaker(bind=pgis_engine)


class City(Base):
    __tablename__ = "City"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    state = Column(String)
    population = Column(Integer)
    area = Column(Float)


def init_db(engine, first_time):
    session = Session()

    if first_time:
        Base.metadata.create_all(engine)

        city1 = City(name="New York", state="NY", population=8800000, area=300.46)
        city2 = City(name="Los Angeles", state="CA", population=3977683, area=468.67)
        city3 = City(name="Chicago", state="IL", population=2716000, area=234.14)
        city4 = City(name="Houston", state="TX", population=2320268, area=599.59)
        city5 = City(name="Phoenix", state="AZ", population=1680992, area=517.64)
        city6 = City(name="Philadelphia", state="PA", population=1584064, area=134.18)
        city7 = City(name="San Antonio", state="TX", population=1532233, area=465.95)
        city8 = City(name="San Diego", state="CA", population=1425976, area=372.39)
        city9 = City(name="Dallas", state="TX", population=1343573, area=385.81)
        city10 = City(name="San Jose", state="CA", population=1030119, area=177.51)
        session.add(city1)
        session.add(city2)
        session.add(city3)
        session.add(city4)
        session.add(city5)
        session.add(city6)
        session.add(city7)
        session.add(city8)
        session.add(city9)
        session.add(city10)
        session.commit()
