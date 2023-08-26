import { Component } from "react";
import Styles from "./map.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "!mapbox-gl";
import React from "react";
import { LngLat } from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiaGlsbG9kZXNpZ24iLCJhIjoiY2w1aXhxcm5pMGIxMTNsa21ldjRkanV4ZyJ9.ztk5_j48dkFtce1sTx0uWw";

export default class MapStd extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lat: props.lat,
      lng: props.lng,
      zoom: props.zoom,
      myMap: null,
    };

    this.loadMap = this.loadMap.bind(this);
    // this.flyTo = this.flyTo.bind(this);

    this.mapContainer = React.createRef();
  }

  async loadMap() {
    const { lng, lat, zoom } = this.state;

    // const mobileOrNot = window.matchMedia("(max-width: 800px)");
    const attractions = this.props.data;

    // console.log("MOBILE ?", mobileOrNot.matches);

    // const optimalZoom =
    //   mobileOrNot.matches && attractions.length > 1 ? 1.2 : zoom;

    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 4.5,
    });

    map.on("load", () => {
      map.addSource("places", {
        // This GeoJSON contains features that include an "icon"
        // property. The value of the "icon" property corresponds
        // to an image in the Mapbox Streets style's sprite.
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                description:
                  '<h1>München</h1><p><a href="https://drive.google.com/file/d/16b2KuOVYiBKFxDk2LpOfSjIobnrAPrpc/view?usp=sharing"</a>GPS Strecken um München</p>',
                icon: "bicycle",
              },
              geometry: {
                type: "Point",
                coordinates: [11.631449, 47.994517],
              },
            },
            {
              type: "Feature",
              properties: {
                description: "<h1>Slowenien</h1>",
                icon: "bicycle",
              },
              geometry: {
                type: "Point",
                coordinates: [14.193308, 46.19124],
              },
            },
            {
              type: "Feature",
              properties: {
                description:
                  '<h1>Mallorca</h1><p><a href="https://drive.google.com/file/d/1CqY1JUsQrJ-8cLSx_VzcTiIkXmk0FiVY/view?usp=drive_link"</a>GPS Strecken für Mallorca</p>',
                icon: "bicycle",
              },
              geometry: {
                type: "Point",
                coordinates: [2.699071, 39.771867],
              },
            },
            {
              type: "Feature",
              properties: {
                description: "<h1>Toscana</h1></p>",
                icon: "bicycle",
              },
              geometry: {
                type: "Point",
                coordinates: [11.117143, 43.165123],
              },
            },
          ],
        },
      });
      // Add a layer showing the places.
      map.addLayer({
        id: "places",
        type: "symbol",
        source: "places",
        layout: {
          "icon-image": ["get", "icon"],
          "icon-allow-overlap": true,
        },
      });

      // When a click event occurs on a feature in the places layer, open a popup at the
      // location of the feature, with description HTML from its properties.
      map.on("click", "places", (e) => {
        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.description;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(description)
          .addTo(map);
      });

      // Change the cursor to a pointer when the mouse is over the places layer.
      map.on("mouseenter", "places", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      // Change it back to a pointer when it leaves.
      map.on("mouseleave", "places", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    const GPXStrecken = [
      {
        name: "Muenchen",
        color: "#F8B0B0",
        lngLat: [11.631449, 47.994517],
      },
      {
        name: "Slowenien",
        color: "#F8B0B0",
        lngLat: [14.193308, 46.19124],
      },
      {
        name: "Mallorca",
        color: "#F8B0B0",
        lngLat: [2.699071, 39.771867],
      },
      {
        name: "Toscana",
        color: "#F8B0B0",
        lngLat: [11.117143, 43.165123],
      },
    ];

    GPXStrecken.forEach(({ lngLat, color }) => {
      new mapboxgl.Marker({ color }).setLngLat(lngLat).addTo(map);
    });

    console.log(attractions);

    this.setState({
      myMap: map,
    });
  }

  // async flyTo(event) {
  //   const lng = event.target.dataset.lng;
  //   const lat = event.target.dataset.lat;

  // console.log("Triggered", lng, lat, this.state.zoom);
  // const map = this.state.myMap;
  // map.flyTo({
  //   center: [lng, lat],
  //   zoom: 1,
  // });
  // }

  componentDidMount() {
    this.loadMap();
  }

  render() {
    return (
      <div>
        <span id="trigger" onClick={this.flyTo}></span>
        <div
          style={{
            width: `${this.props.width}`,
            height: `${this.props.height}`,
          }}
          className={Styles.map}
          ref={this.mapContainer}
        ></div>
      </div>
    );
  }
}
