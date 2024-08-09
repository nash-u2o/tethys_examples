import json
import re
import zipfile
from io import BytesIO, StringIO

import geopandas as gpd
import kml2geojson as k2g
import shapefile
import shapely
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from fiona.io import ZipMemoryFile
from shapely.geometry import mapping
from tethys_sdk.routing import controller

from .model import Layer, Session, Shape


@controller
def home(request):
    """
    Render home. You probably didn't need to be told that, but that's neither here nor there. This is my job, not yours.

    Returns:
        HttpResponse: Render returns a HttpResponse which is returned by the function to load the home page
    """
    return render(request, "file_io/home.html")


@controller
def form_upload(request):
    """
    Get the file and the file_name. Choose what to do based on extension

    Returns:
        JsonResponse: Returns a geojson containing the features from either the shp or kml file
    """

    # A FormData object has been submitted in this request. Files are stored in request.FILES and other information is stored in request.POST. FD objects do this by default
    file = request.FILES["file-picker"]
    file_content = file.read()
    file_name = request.POST["name"]
    if ".zip" in str(file):
        return parse_shp(file_content, file_name)
    elif ".kml" in str(file):
        return parse_kml(file_content, file_name)


@controller
def gj_upload(request):
    """
    Get the file name and the geojson from the request. Use these to save the layer to the DB

    Returns:
        HttpResponse: Empty response because nothing needs to be done here, but a request is required
    """
    # Save the geojson
    file_name = request.POST["file_name"]
    geojson = request.POST["geojson"]
    save_layer(file_name, geojson)
    return HttpResponse()


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
    return render(request, "file_io/load.html", context)


@controller
def load_layer(request):
    """
    Load the layer selected by the user

    Returns:
        JsonResponse: Return a JsonResponse holding the geometry and properties of the loaded layer
    """
    # Query for a specific layer based on id
    session = Session()
    query_res = session.query(Shape).filter_by(layer_id=request.GET.get("id"))

    # Create a dictionary to store all properties + geometry associated w/ the shapes in the layer
    dict = {}
    for shape in query_res:
        dict[shape.id] = {
            "geom": str(shape.geometry),
            "properties": {
                "id": shape.id,
                "name": shape.name,
                "description": shape.description,
            },
        }

        # the property json is stored as a string in the shape. Load the json
        loaded_json = json.loads(shape.json)
        for key in loaded_json:
            if dict[shape.id]["properties"].get(key) is None:
                dict[shape.id]["properties"][key] = loaded_json[key]

    session.close()

    return JsonResponse(dict)


def parse_shp(file_content, file_name):
    """
    To parse the features from the shapefile, we must put it in memory. Open the .shp file to allow GeoPandas to read through the virtual directory, generating a GeoDataFrame
    Get the json of the GDF and save the layer

    Args:
        file_content: Byte stream of the file submitted to the html
        file_name: Name of the file passed from the JS side. Used to name file in the database

    Returns:
        JsonResponse: Return a JsonResponse containing the GeoJson of the geometry and their properties
    """
    # Use BytesIO to handle the file content in memory - turn the byte stream into a binary stream to use
    with zipfile.ZipFile(BytesIO(file_content), "r") as zip_ref:
        # Get the file names
        namelist = zip_ref.namelist()

    # Get the shp file name
    for name in namelist:
        if ".shp" in name:
            shp_file_name = name
            break

    with ZipMemoryFile(file_content) as zip_ref:
        # Open the shapefile and create a gpd with it. Geopandas figures out the files within the ZipMemoryFile
        with zip_ref.open(shp_file_name) as collection:
            gdf = gpd.read_file(collection.path)

        # If geometries are naive, default to 4326
        if gdf.crs is None:
            gdf.set_crs(epsg=4326, inplace=True)
        gdf.to_crs(epsg=3857, inplace=True)
        gj_res = gdf.to_json()

        save_layer(file_name, gj_res)

        return JsonResponse(json.loads(gj_res))

    # Old complicated way. Maybe some insight into in memory file stuff here
    # try:
    #     # Convert the zip file bytes to binary and read it like a normal file
    #     gdf = gpd.read_file(BytesIO(file_content))

    #     gdf.to_crs(epsg=3857, inplace=True)
    #     gj_res = gdf.to_json()

    #     save_layer(file_name, gj_res)
    #     return JsonResponse(json.loads(gj_res))
    # except:
    #     print("failed gpd read_file")

    #     # Use BytesIO to handle the file content in memory - turn the byte stream into a binary stream
    #     with zipfile.ZipFile(BytesIO(file_content), "r") as zip_ref:
    #         # Extract files to a dictionary
    #         extracted_files = {name: zip_ref.read(name) for name in zip_ref.namelist()}

    #     # Get the file name
    #     shp_reg = r"(\S*).shp"
    #     keys = list(extracted_files.keys())
    #     file_name = None
    #     for key in keys:
    #         match = re.match(shp_reg, key)
    #         if match is not None:
    #             file_name = match.group(1)
    #             break

    #     # Read the shapefile from the extracted files

    #     shp_file = BytesIO(extracted_files[f"{file_name}.shp"])
    #     shx_file = BytesIO(extracted_files[f"{file_name}.shx"])
    #     dbf_file = BytesIO(extracted_files[f"{file_name}.dbf"])

    #     sf = shapefile.Reader(shp=shp_file, shx=shx_file, dbf=dbf_file)

    #     with ZipMemoryFile(file_content) as zip_ref:
    #         # Get the crs for dynamic EPSG
    #         with zip_ref.open(f"{file_name}.shp") as collection:
    #             gdf = gpd.read_file(collection.path)

    #             print("\n\n\n\n\nHERE\n\n\n\n\n\n")
    #             crs = str(collection.crs)  # No prj = no crs

    #         # If no crs, default to 4326
    #         if crs == "":
    #             crs = "EPSG:4326"

    #         # Get features and create a FeatureCollection for GeoDataFrame
    #         geojson_features = [mapping(shape) for shape in sf.shapeRecords()]
    #         feature_collection = {
    #             "type": "FeatureCollection",
    #             "features": geojson_features,
    #         }
    #         # gdf = gpd.GeoDataFrame.from_features(features=feature_collection, crs=crs)

    #         gdf.to_crs(epsg=3857, inplace=True)
    #         gj_res = gdf.to_json()

    #         save_layer(file_name, gj_res)
    #         return JsonResponse(json.loads(gj_res))


def parse_kml(file_content, file_name):
    """
    Parse a KML file. KML is a text format, so besides decoding from utf-8, nothing needs to be done to read the file. I use an external library called
    kml2geojson to make the conversion to GJ for me

    Args:
        file_content: Byte stream of the file submitted to the html
        file_name: Name of the file passed from the JS side. Used to name file in the database

    Returns:
        JsonResponse: Return a JsonResponse containing the GeoJson of the geometry and their properties
    """
    # Doesn't have to be read in as an in-memory file because KML is a text format
    kml_str = file_content.decode("utf-8")
    # Turn kml_str into file-like object for conversion
    kml_str_io = StringIO(kml_str)
    res = k2g.convert(kml_str_io)

    # Dealing with the crs here isn't straightforward because we aren't necessarily given a crs. For now, assume lat lon
    gdf = gpd.GeoDataFrame.from_features(features=res[0], crs="EPSG:4326")
    gdf.to_crs(epsg=3857, inplace=True)
    gj_res = gdf.to_json()

    save_layer(file_name, gj_res)
    return JsonResponse(json.loads(gj_res))


def save_layer(file_name, gj_res):
    """
    Given a geojson of the layer, create a Shape tuple for every feature

    Args:
        file_name: Used for the layer tuple's name
        gj_res: Contains the features and the information associated with them

    """
    # Setup the geojson and get the features
    gj_features = json.loads(gj_res)["features"]

    session = Session()

    # Create layer
    layer = Layer(name=file_name)
    session.add(layer)
    session.commit()

    # Handle the individual shapes
    layer_id = layer.id
    for feature in gj_features:
        properties = feature["properties"]
        # If None upon Shape creation, will be null in database
        name = None
        desc = None

        # These are hardcoded properties for the example
        if properties.get("name"):
            name = properties["name"]
            del properties["name"]
        if properties.get("description"):
            desc = properties["name"]
            del properties["description"]

        # Create a shapely shape and get the wkb_hex for DB storage
        geometry = shapely.geometry.shape(feature["geometry"])
        geometry_wkb = geometry.wkb_hex

        shape = Shape(
            name=name,
            description=desc,
            json=json.dumps(properties),
            layer_id=layer_id,
            geometry=geometry_wkb,
        )

        session.add(shape)
        session.commit()

    session.close()
