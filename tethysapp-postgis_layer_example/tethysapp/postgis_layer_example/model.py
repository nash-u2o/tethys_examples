from geoalchemy2 import Geometry
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

from .app import PostgisLayerExample as app

Base = declarative_base()
pgis_engine = app.get_persistent_store_database(app.DATABASE_NAME)
Session = sessionmaker(bind=pgis_engine)


class Layer(Base):
    __tablename__ = "Layer"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    geometry = Column(Geometry(geometry_type="GEOMETRYCOLLECTION", srid=4326))
    color = Column(String)


def init_db(engine, first_time):
    session = Session()

    if first_time:
        Base.metadata.create_all(engine)
