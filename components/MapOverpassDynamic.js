import React, { useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useGeoLocation from "../components/useGeoLocation";
// import OverPassLayer from "leaflet-overpass-layer";
// import { fetchData } from './Overpass';
import munich_fountains from "../lib/munich_fountains.json";
import repair_station from "../Repair_station.json";

// fetchData();

const MapOverpassDynamic = () => {
  const mapRef = useRef();

  const location = useGeoLocation();
  const markerIcon = L.icon({
    iconUrl: "../platzhalter.png",
    iconSize: [64, 64], // Adjust the size of the icon
    iconAnchor: [32, 64], // Adjust the anchor point of the icon
    popupAnchor: [0, -32], // Adjust the popup anchor point
  });
  const showMyLocation = () => {
    if (location.loaded && !location.error) {
      mapRef.current.leafletElement.flyTo(
        [location.coordinates.lat, location.coordinates.lng],
        ZOOM_LEVEL,
        { animate: true }
      );
    } else {
      alert(location.error.message);
    }
  };

  const pointToLayer = (feature, latlng) => {
    // Customize the marker icon here
    const markerIcon = L.icon({
      iconUrl: "../trinkflasche.png",
      iconSize: [32, 32], // Adjust the size of the icon
      iconAnchor: [16, 32], // Adjust the anchor point of the icon
      popupAnchor: [0, -32], // Adjust the popup anchor point
    });

    // Create a marker with the custom icon
    return L.marker(latlng, { icon: markerIcon });
  };
  const setColor = ({ properties }) => {
    return { weight: 1 };
  };

  function MapContent({ map }) {
    return <></>;
  }

  //circle für test
  const center = [51.505, -0.09];
  const rectangle = [
    [51.49, -0.08],
    [51.5, -0.06],
  ];
  return (
    <div>
      <MapContainer
        center={[48.13, 11.57]}
        zoom={10}
        style={{ width: "100%", height: "1000px" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {location.loaded && !location.error && (
          <Marker
            icon={markerIcon}
            position={[location.coordinates.lat, location.coordinates.lng]}
          ></Marker>
        )}
        {/* <GeoJSON data={munich_fountains} pointToLayer={pointToLayer} /> */}
        <LayersControl position="topright">
          <LayersControl.Overlay name="Trinkwasser">
            <GeoJSON data={munich_fountains} pointToLayer={pointToLayer} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Reparaturstation">
            <GeoJSON data={repair_station} pointToLayer={pointToLayer} />
          </LayersControl.Overlay>
        </LayersControl>
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamic;
