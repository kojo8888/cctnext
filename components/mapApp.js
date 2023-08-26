import { Component } from "react";
import Styles from "./map.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "!mapbox-gl";
import React from "react";
import { LngLat } from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiaGlsbG9kZXNpZ24iLCJhIjoiY2w1aXhxcm5pMGIxMTNsa21ldjRkanV4ZyJ9.ztk5_j48dkFtce1sTx0uWw";

export default class MapApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lat: props.lat,
      lng: props.lng,
      zoom: props.zoom,
      myMap: null,
    };

    this.loadMap = this.loadMap.bind(this);

    this.mapContainer = React.createRef();
  }

  async loadMap() {
    const { lng, lat, zoom } = this.state;

    const attractions = this.props.data;

    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 4.5,
    });

    map.on("load", () => {
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

      var marker = new mapboxgl.Marker();

      function add_marker(event) {
        var coordinates = event.lngLat;
        console.log("Lng:", coordinates.lng, "Lat:", coordinates.lat);
        marker.setLngLat(coordinates).addTo(map);
      }

      map.on("click", add_marker);
    });

    this.setState({
      myMap: map,
    });
  }

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
