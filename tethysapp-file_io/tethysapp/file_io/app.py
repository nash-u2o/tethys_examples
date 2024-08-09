from tethys_sdk.app_settings import PersistentStoreDatabaseSetting
from tethys_sdk.base import TethysAppBase


class FileIo(TethysAppBase):
    """
    Tethys app class for File Io.
    """

    name = "File Io"
    description = ""
    package = "file_io"  # WARNING: Do not change this value
    index = "home"
    icon = f"{package}/images/icon.gif"
    root_url = "file-io"
    color = "#5f27cd"
    tags = ""
    enable_feedback = False
    feedback_emails = []

    DATABASE_NAME = "input_ex_db "

    def persistent_store_settings(self):
        ps_settings = (
            PersistentStoreDatabaseSetting(
                name=self.DATABASE_NAME,
                description="primary database",
                initializer="file_io.model.init_db",
                required=True,
                spatial=True,
            ),  # This comma HAS to be here
        )

        return ps_settings
