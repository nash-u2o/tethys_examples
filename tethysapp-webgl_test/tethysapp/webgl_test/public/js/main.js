$(function(){
  //Openlayers supports rendering webgl points on its own, but this subclass has to be created to render lines and polygons
  class WebGLLayer extends ol.layer.Layer {
    createRenderer() {
      return new ol.renderer.webgl.VectorLayer(this, {
        className: this.getClassName(),
        style: {
          'stroke-width': 5,
          'stroke-color': 'rgba(24,86,34,0.7)',
          'stroke-offset': -1,
          'fill-color':  '#ff3f3f',
        },
      });
    }
  }

  const point_source = new ol.source.Vector({});
  const line_source = new ol.source.Vector({});
  const poly_source = new ol.source.Vector({});
  const webgl_source = new ol.source.Vector({});
  // const cluster = new ol.source.Cluster({source: source})

  const point_vector = new ol.layer.Vector({
    source: point_source,
  });
  const line_vector = new ol.layer.Vector({
    source: line_source,
  });
  const poly_vector = new ol.layer.Vector({
    source: poly_source
  });

  // Make some random points
  for(let i = 0; i < 1000; i++){
    const latitude = Math.random() * 180 - 90;
    const longitude = Math.random() * 360 - 180;
    const point_feature = new ol.Feature({
      'geometry': new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude])),
      'hover': 0,
      'hover_color': '#' + Math.floor(Math.random() * 16777215).toString(16),
      'not_hover_color': '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
    point_source.addFeature(point_feature);
  }

  //Make some random lines
  for(let i = 0; i < 250; i++){
    const latitude1 = Math.random() * 180 - 90;
    const longitude1 = Math.random() * 360 - 180;
    const latitude2 = Math.random() * 180 - 90;
    const longitude2 = Math.random() * 360 - 180;
    const coord1 = ol.proj.fromLonLat([longitude1, latitude1]);
    const coord2 = ol.proj.fromLonLat([longitude2, latitude2]);
    const line_feature = new ol.Feature({
      'geometry': new ol.geom.LineString([coord1, coord2]),
      'hover': 0,
      'hover_color': '#' + Math.floor(Math.random() * 16777215).toString(16),
      'not_hover_color': '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
    //line_source.addFeature(line_feature);
    webgl_source.addFeature(line_feature);
  }

  // Some random polygons
  for(let i = 0; i < 5; i++){
    let coord_list = [];
    let first_point;
    for(let j = 0; j < 2 + Math.ceil(Math.random() * 4); ++j){
      const latitude = Math.random() * 180 - 90;
      const longitude = Math.random() * 360 - 180;
      coord_list.push(ol.proj.fromLonLat([longitude, latitude]));
      if(j == 0) first_point=ol.proj.fromLonLat([longitude, latitude]);
    }
    coord_list.push(first_point);
    const poly_feature = new ol.Feature({
      'geometry': new ol.geom.Polygon([coord_list]),
      'hover': 0,
      'hover_color': '#' + Math.floor(Math.random() * 16777215).toString(16),
      'not_hover_color': '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
    //poly_source.addFeature(poly_feature);
    webgl_source.addFeature(poly_feature);
  }

  //must explicitly pass source: my_source or it does not work
  const webgl_vector = new WebGLLayer({source: webgl_source});

  //Note: Don't use "-" in property names. Causes a syntax error so I used "_"
  const styles = {
    'circles-zoom': {
      'circle-radius': [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        5, //zoom level
        1.5,
        15,
        1.5 * Math.pow(2, 10),
      ],
      'circle-fill-color': ['match', ['get', 'hover'], 1, '#ff3f3f', '#006688'],
      'circle-displacement': [0, 0],
      'circle-opacity': 0.95,
    },
    'triangles-latitude': {
      'shape-points': 3,
      'shape-radius': 6,
      'shape-fill-color': '#ff14c3',
      'shape-opacity': 0.95,
    },
    'random-colors': {
      'circle-radius': 7,
      // 'circle-fill-color': ['match', ['get', 'hover'], 1, ['get', 'hover_color'], '#006688'], // If the hover value of a attribute is 1, set the color to the aptly named hover-color, else not-hover-color
      // Doesn't seem like doing dynamic colors like this actually works. Circle just disappears on hover
      'circle-fill-color': ['match', ['get', 'hover'], 1, '#ff3f3f', '#006688'],
      'circle-displacement': [0, 0],
      'circle-opacity': 0.95,
    },
    'line-styling': {
      'stroke-width': 5,
      'stroke-color': 'rgba(24,86,34,0.7)',
      'stroke-offset': -1
    }
  }

  const webgl_points_layer = new ol.layer.WebGLPoints({
    source: point_source,
    // source: cluster,
    style: styles["random-colors"]
  });

  const map = new ol.Map({
    view: new ol.View({
      center: [0, 0],
      zoom: 1,
    }),
    layers: [
      new ol.layer.Tile({
          source: new ol.source.OSM(),
      }),

      webgl_points_layer,
      webgl_vector
      //poly_vector

    ],
    target: 'map',
  });

  // const select = new ol.interaction.Select({
  //   layers: [webglLinesLayer],
  // });

  // const translate = new ol.interaction.Translate({
  //   features: select.getFeatures()
  // });

  // map.addInteraction(select);
  // map.addInteraction(translate);

  const draw = new ol.interaction.Draw({
    type: 'LineString',
    source: webgl_source
  })

  map.addInteraction(draw)

  // let selected = null;

  // //Kind of janky. Makes selection behave oddly
  // map.on('pointermove', function (ev) {
  //   if (selected !== null) {
  //     selected.set('hover', 0);
  //     selected = null;
  //   }
  
  //   map.forEachFeatureAtPixel(ev.pixel, function (feature) {
  //     feature.set('hover', 1);
  //     console.log(feature.get("hover_color"))
  //     selected = feature;
  //     return true;
  //   });
  // });
});