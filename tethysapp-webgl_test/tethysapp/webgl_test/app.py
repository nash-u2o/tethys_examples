from tethys_sdk.base import TethysAppBase


class WebglTest(TethysAppBase):
    """
    Tethys app class for Webgl Test.
    """

    name = 'Webgl Test'
    description = ''
    package = 'webgl_test'  # WARNING: Do not change this value
    index = 'home'
    icon = f'{package}/images/icon.gif'
    root_url = 'webgl-test'
    color = '#c23616'
    tags = ''
    enable_feedback = False
    feedback_emails = []