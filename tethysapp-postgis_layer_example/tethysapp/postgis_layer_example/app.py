from tethys_sdk.app_settings import PersistentStoreDatabaseSetting
from tethys_sdk.base import TethysAppBase


class PostgisLayerExample(TethysAppBase):
    """
    Tethys app class for Postgis Layer Example.
    """

    name = "Postgis Layer Example"
    description = ""
    package = "postgis_layer_example"  # WARNING: Do not change this value
    index = "home"
    icon = f"{package}/images/icon.gif"
    root_url = "postgis-layer-example"
    color = "#c23616"
    tags = ""
    enable_feedback = False
    feedback_emails = []

    DATABASE_NAME = "postgis_layer_db"

    def persistent_store_settings(self):
        ps_settings = (
            PersistentStoreDatabaseSetting(
                name=self.DATABASE_NAME,
                description="primary database",
                initializer="postgis_layer_example.model.init_db",
                required=True,
                spatial=True,
            ),  # For random future reference, this comma HAS to be here
        )

        return ps_settings
