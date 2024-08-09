$(function() {
  $('#select-geom option[value="draw-polygon"]').attr('selected', true);

  //Source and vector for drawn features
  const source = new ol.source.Vector({wrapX: false});
  const vector = new ol.layer.Vector({source: source});

  //Source and vector for loaded features
  const loadSource = new ol.source.Vector({wrapX: false});
  const loadVector = new ol.layer.Vector({source: loadSource});

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
      loadVector,
    ],
    target: 'map',
  });

  // Create styles for features
  const fill = new ol.style.Fill({
    color: 'rgba(255,255,255,0.4)',
  });
  const stroke = new ol.style.Stroke({
    color: json["color"],
    width: 3,
  });
  const style = [
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
    
  // START INTERACTIONS

  const drawPoint = new ol.interaction.Draw({
    type: "Point",
    source: source,
  });

  const drawPolyline = new ol.interaction.Draw({
    type: "LineString",
    source: source,
  });

  const drawPolygon = new ol.interaction.Draw({
    type: "Polygon",
    source: source,
  });

  // END INTERACTIONS

  map.addInteraction(drawPolygon);

  // Hex random color generator
  function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // START BUTTONS

  // When clicking save button on main page
  $("#save-button").off("click").on("click", function(){
    $("#save-modal").modal("show");
    const color_picker = document.getElementById("color");
    color_picker.value = getRandomColor();

    // When clicking save button on modal
    $("#save").off("click").on("click", function(){
      //Get value user typed and features from source
      const name = document.getElementById("lname").value;
      const features = vector.getSource().getFeatures();

      //Aggregate geometries into a geometryCollection
      const geometries = [];
      for(let i = 0; i < features.length; i++){
        geometries.push(features[i].getGeometry());
      }
      const geometryCollection = new ol.format.WKB().writeGeometry(new ol.geom.GeometryCollection(geometries));

      //Send post request to save layer of geometries
      $.ajax({
        url: "create-layer/",
        type: 'POST',
        data: {
          name: name,
          geometryCollection: geometryCollection,
          color: color_picker.value,
        },
        success: function() {
          //Clear saved features from map and hide modal
          source.clear()
          $("#save-modal").modal("hide");
        }
      });
    });
  });

  // When click load button on main page
  $("#load-button").off("click").on("click", function(){
    $("#load-modal").modal("show");

    //Load all layers for dropdown menu. Get name and associated ID
    $.ajax({
      url: "load-all-layers/",
      type: 'GET',
      data: {loadAll: true},
      success: function(res) {
        document.getElementById("load-select").innerHTML = res;
      }
    });
  });

  // When click load button on modal
  $("#load-submit").off("click").on("click", function(){
    $("#load-modal").modal("hide");
    // Send get request. On success load features into map
    $.ajax({
      url: "load-layer",
      type: 'GET',
      data: {id: document.getElementById("load-select").value},
      success: function(res) {
        // Parse response for geometry
        const json = JSON.parse(res)
        const geomCollection = new ol.format.WKB().readGeometry(json["geom"]);
        const geometries = geomCollection.getGeometries();

        // Create features, set styles, and add them to the source to display them on the map
        for(let i = 0; i < geometries.length; i++){
          let feature = new ol.Feature({geometry: geometries[i]});
          feature.setStyle(style);
          loadSource.addFeature(feature);
        }
      }
    });
  });

  // END BUTTONS

  //Select menu for drawing geometries
  $('#select-geom').change(function(){
    switch($(this).val()){
      case 'draw-polygon':
        map.removeInteraction(drawPoint);
        map.removeInteraction(drawPolyline);
        map.addInteraction(drawPolygon);
        break;
      case 'draw-polyline':
        map.removeInteraction(drawPoint);
        map.removeInteraction(drawPolygon);
        map.addInteraction(drawPolyline);
        break;
      case 'draw-point':
        map.removeInteraction(drawPolygon);
        map.removeInteraction(drawPolyline);
        map.addInteraction(drawPoint);
        break;
    }
  });
});