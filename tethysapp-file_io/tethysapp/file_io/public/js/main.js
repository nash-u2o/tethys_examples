$(function(){
  class ControlPanel extends ol.control.Control {
    /**
     * Class used to create the forms on the left side of the screen
     */
    constructor(opt_options){
      const options = opt_options || {};

      const element = document.createElement('div');
      element.className = 'file-upload-control ol-unselectable ol-control panel-display';
      element.innerHTML = `
        <form id="file-form" action="form-upload/" method="POST" enctype="multipart/form-data">
          <input type="hidden" name="csrfmiddlewaretoken" value="${document.querySelector('[name=csrfmiddlewaretoken]').value}">
          <label for="file-picker">Select a file (shp, kml, geojson)</label><br>
          <input type="file" id="file-picker" name="file-picker"><br>
          <input type="submit" id="submit" value="Submit"><br>
        </form>
        <button id="load-button" style="width: 55%; font-size: 15px;">Load Previous Layer</button>
      `;

      super({
        element: element,
        target: options.target,
      });
    }
  }

  const source = new ol.source.Vector({})
  const vector = new ol.layer.Vector({
    source: source,
  })

  const map = new ol.Map({
    view: new ol.View({
      center: [0, 0],
      zoom: 1,
    }),
    layers: [
      new ol.layer.Tile({
          source: new ol.source.OSM(),
      }),
      vector,
    ],
    target: 'map',
  });

  const controlPanel = new ControlPanel();
  map.addControl(controlPanel);

  const fill = new ol.style.Fill({
    color: 'rgba(255,255,255,0.4)',
  });
  const stroke = new ol.style.Stroke({
    color: '#3f3e40',
    width: 3,
  });
  const default_style = [
    new ol.style.Style({
      image: new ol.style.Circle({
        fill: fill,
        stroke: stroke,
        radius: 5,
      }),
      fill: fill,
      stroke: stroke,
    }),
  ];

  $("#file-form").on("submit", function(event){
    /**
     * When a file is submitted, get its name and decide what to do with it based on the extension. Processing a geojson is fairly straightforward and all the features may need is to be reprojected
     * before being added to the map. KML and SHP files are sent off to be processed by the server and a GeoJson is returned by the request; Use this to add features to the map
     */
    event.preventDefault();

    //Check the extension of the submitted file
    const file = document.getElementById("file-picker").files[0];
    if(file == undefined) return

    //Get the extension to determine how to handle the file
    const fileName = file.name;
    const index = fileName.indexOf(".");  
    const extension = fileName.substr(index + 1);
    if(extension == "geojson"){
      const fileReader = new FileReader();
      fileReader.onload = function(e){
        //Get geojson and then epsg. Reproject if necessary
        const geojson = JSON.parse(e.target.result);
        const epsg = getEPSGCode(geojson);
        const features = new ol.format.GeoJSON({
          dataProjection: epsg,
          featureProjection: "EPSG:3857"
        }).readFeatures(geojson);

        //Assign name and description 
        for(let key in features){
          let feature = features[key];
          let properties = feature.getProperties();
          //Name and description are just hardcoded properties for this specific example
          if(properties["name"] == undefined){
            feature.setProperties({"name": null});
          }
          if(properties["description"] == undefined){
            feature.setProperties({"description": null});
          }
        }
        source.addFeatures(features);
        
        //Store the reprojected features
        const reprojectedFeatures = new ol.format.GeoJSON().writeFeatures(features);
        $.ajax({
          url: 'gj-upload/',
          type: 'POST',
          data: {
            file_name: fileName,
            geojson: reprojectedFeatures,
          },
        });
      };
      fileReader.readAsText(file)
    } else if(extension == "zip" || extension == "kml"){
      //Make a FormData object to submit the uploaded file (this)
      const formData = new FormData(this)
      formData.append("name", fileName)
      $.ajax({
        url: 'form-upload/',
        type: 'POST',
        data: formData,
        processData: false, // Prevent jQuery from automatically transforming the data into a query string. Needed to send binary data/files
        contentType: false, // Prevent jQuery from overriding the Content-Type header. FormData automatically sets the content type to the appropriate multipart/form-data
        success: function (response) {
          const features = response["features"];
          
          addJsonFeaturesToSource(features, source)
        },
      });
    } else {
      console.log("Unsupported file type");
    }
  });

  // When load button on main page clicked
  $("#load-button").off("click").on("click", function(){
    $("#load-modal").modal("show");

    //Load all layers for dropdown menu. Get name and associated ID
    $.ajax({
      url: "load-all-layers/",
      type: 'GET',
      data: {loadAll: true},
      success: function(res) {
        //Use the html <options> generated by load to populate the dropdown
        document.getElementById("load-select").innerHTML = res;
      }
    });
  });

  // When load button on modal clicked
  $("#load-submit").off("click").on("click", function(){
    /**
     * Hide the modal and send an ajax request with the id of what was selected. These ids were assigned in the creation of the modal
     * Get a geojson holding the features back and add the features to the map
     */
    $("#load-modal").modal("hide");
    $.ajax({
      url: "load-layer",
      type: 'GET',
      data: {id: document.getElementById("load-select").value},
      success: function(res) {
        const json = res;   
        
        //Add geometry to source
        for(let key in json){
          const geom = new ol.format.WKB().readGeometry(json[key]["geom"]);
          const feature = new ol.Feature({geometry: geom});

          //Add the properties associated with the geometry and set some styling
          feature.setProperties(json[key]["properties"])
          feature.setStyle(default_style);

          source.addFeature(feature);
        }
      }
    });
  });

  //Get features at pixel, pick the first one, and display its properties on a modal
  map.on('click', function(e) {
    const features = map.getFeaturesAtPixel(e.pixel);
    if(features.length > 0){
      const feature = features[0];
      //Associating properties with the features makes this much easier than making a request to get properties from DB each time a feature is clicked
      properties = feature.getProperties();

      //Build an html string to display the different properties w/ their respective values
      let infoString = "<table id='info-table'>";
      infoString += "<tr><th>Property</th><th>Value</th></tr>";
      for(let key in properties){
        if(key != "geometry"){
          infoString += "<tr>";
          infoString += "<th>" + key + "</th>";
          infoString += "<td>" + properties[key] + "</td>";
          infoString += "</tr>";
        }
      }
      infoString += "</table>";
      document.getElementById("info-body").innerHTML = infoString;
      $("#info-modal").modal("show");
    }
  });

  function addJsonFeaturesToSource(features, source){
    /**
     * Create features using geometry from features array and add them to the source
     */
    for(let i = 0; i < features.length; i++){
      let current = features[i]
      let feature = new ol.Feature();
      feature.setGeometry(new ol.format.GeoJSON().readGeometry(current["geometry"]));
      feature.setProperties({"id": current["id"], "name": current["properties"]["name"] || "null", "description": current["properties"]["description"] || "null"});
      delete current["properties"]["name"];
      delete current["properties"]["description"];
      feature.setProperties(current["properties"])
      source.addFeature(feature);
    }
  }

  function getEPSGCode(json){
    /**
     * Gets the EPSG code from a geojson if it's there. Else, default to EPSG:4326. This function is in OL-HSB-LIB now
     * 
     * Returns:
     * EPSG string
     */
    const reg = RegExp("EPSG:\\d+");
    let sourceCRS = json.crs ? json.crs.properties.name : "EPSG:4326";
    if(sourceCRS == "EPSG:4326"){
      return sourceCRS;
    } 

    //Replace any series of one or more colons with a single colon for the regular expression
    const cleanCRS = sourceCRS.replace(/:+/g, ":");
    const epsgIndex = cleanCRS.search(reg);
    if(epsgIndex == -1){
      return "EPSG:4326";
    }

    const epsg = cleanCRS.match(reg)[0];
    return epsg;
  }
});