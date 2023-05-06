import { Component } from "react";
import Styles from "./map.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "!mapbox-gl";
import React from "react";
import { LngLat } from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiaGlsbG9kZXNpZ24iLCJhIjoiY2w1aXhxcm5pMGIxMTNsa21ldjRkanV4ZyJ9.ztk5_j48dkFtce1sTx0uWw";

export default class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lat: props.lat,
      lng: props.lng,
      zoom: props.zoom,
      myMap: null,
    };

    this.loadMap = this.loadMap.bind(this);
    this.flyTo = this.flyTo.bind(this);

    this.mapContainer = React.createRef();
  }

  async loadMap() {
    const { lng, lat, zoom } = this.state;

    const mobileOrNot = window.matchMedia("(max-width: 800px)");
    const attractions = this.props.data;

    console.log("MOBILE ?", mobileOrNot.matches);

    const optimalZoom =
      mobileOrNot.matches && attractions.length > 1 ? 1.2 : zoom;

    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 4.5,
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

  async flyTo(event) {
    const lng = event.target.dataset.lng;
    const lat = event.target.dataset.lat;

    console.log("Triggered", lng, lat, this.state.zoom);
    const map = this.state.myMap;
    map.flyTo({
      center: [lng, lat],
      zoom: 1,
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
