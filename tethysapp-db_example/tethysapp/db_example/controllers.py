import json

from django.http import HttpResponse
from django.shortcuts import render
from sqlalchemy import inspect, select
from tethys_sdk.routing import controller

from .model import City, Session


@controller
def home(request):
    """
    Programatically get the columns and rows for the City table. Use this to populate the modal by generating html for the modal using table.html (on click of the load button) or creating the context and sending
    the data to JS to handle using home.html (default behavior)

    Returns:
        HttpResponse: If the get request has a boolean called modal passed with it as True, return an HttpResponse of the html for the modal, else return an HtmlResponse to load the home page
    """

    # Create a session to get access to database
    session = Session()

    # Execute a simple SQL statement and extract the columns and the rows. Alternative way of getting rows and columns
    # res = session.execute('SELECT * FROM "City"')
    # columns = res.keys()
    # rows = res.all()

    # This is a way to programtically get column names and rows without knowing the layout of the table accessed
    res = session.query(City).all()
    columns = [column.key for column in inspect(City).mapper.column_attrs]
    rows = [[getattr(row, column) for column in columns] for row in res]

    # To access this data in the html file, just use their names
    context = {
        "columns": columns,
        "rows": rows,
    }

    if request.GET.get("modal"):
        # Render returns the html from the table.html file, which contains the table for the modal
        return render(request, "db_example/table.html", context)
    else:
        return render(request, "db_example/home.html", context)
