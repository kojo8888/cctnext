import { Component } from "react";
import Styles from "./map.module.css";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "!mapbox-gl";
import React from "react";

mapboxgl.accessToken =
  "pk.eyJ1Ijoia29qbzg4IiwiYSI6ImNsaGJ0djg4YTA1dGIzZ252azN0ajNqcnkifQ.1CZ-Nr2pIHetUrU8TxAnOQ";

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
      style: "mapbox://styles/hillodesign/clb95v8zd000v15nudmodao0i",
      center: [lng, lat],
      zoom: 9,
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
      zoom: 4,
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
