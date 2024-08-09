import json

from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST
from tethys_sdk.routing import controller

from .model import Layer, Session


@controller
def home(request):
    """
    Render home. Not sure you needed that, but there it is

    Returns:
        HttpResponse: Render returns a HttpResponse which is returned by the function to load the home page
    """
    return render(request, "postgis_layer_example/home.html")


@require_POST
@controller
def create_layer(request):
    """
    Create a layer using the information passed through the request

    Returns:
        HttpResponse: Unused response object to keep django happy
    """
    session = Session()
    # Create a Layer with data passed through request. geometryCollection is a nice catch-all for multiple geometries
    geometryCollection = Layer(
        name=request.POST["name"],
        geometry=request.POST["geometryCollection"],
        color=request.POST["color"],
    )
    session.add(geometryCollection)
    session.commit()
    session.close()
    return render(request, "postgis_layer_example/home.html")


@require_GET
@controller
def load_all_layers(request):
    """
    Load every layer and use load.html to generate the html for the dropdown select.

    Returns:
        HttpResponse: Render returns the Html for the dropdown menu. Return that to the JS
    """
    # Query the db for names and ids of all layers
    session = Session()
    rows = session.query(Layer).all()
    session.close()

    # Couple the id with the name for the html values
    entries = {row.id: row.name for row in rows}
    context = {"entries": entries}
    return render(request, "postgis_layer_example/load.html", context)


@require_GET
@controller
def load_layer(request):
    """
    Load the layer selected by the user

    Returns:
        HttpResponse: Return a JsonResponse holding the geometry of a layer and the color associated with it
            For some reason, Django gets angry when I don't return and HttpResponse
    """
    # Query for a specific layer based on id
    session = Session()
    query_res = session.query(Layer).filter_by(id=request.GET.get("id")).first()
    geom = query_res.geometry
    color = query_res.color
    dict = {
        "geom": str(geom),
        "color": color,
    }
    session.close()

    # Make json into string for httpresponse because it won't return a jsonresponse for some reason
    return HttpResponse(json.dumps(dict))
