from tethys_sdk.app_settings import (
    PersistentStoreDatabaseSetting,
    SpatialDatasetServiceSetting,
)
from tethys_sdk.base import TethysAppBase


class DbExample(TethysAppBase):
    """
    Tethys app class for Db Example.
    """

    name = "Db Example"
    description = ""
    package = "db_example"  # WARNING: Do not change this value
    index = "home"
    icon = f"{package}/images/icon.gif"
    root_url = "db-example"
    color = "#d35400"
    tags = ""
    enable_feedback = False
    feedback_emails = []

    DATABASE_NAME = "primary_db"

    def persistent_store_settings(self):
        ps_settings = (
            PersistentStoreDatabaseSetting(
                name=self.DATABASE_NAME,
                description="primary database",
                initializer="db_example.model.init_db",
                required=True,
                spatial=True,
            ),
        )

        return ps_settings
