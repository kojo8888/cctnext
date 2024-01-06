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
import Viereck from "../lib/Viereck.json";
import nodes from "../lib/nodes.json";

const MapOverpassDynamic = () => {
  const mapRef = useRef();

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
        <GeoJSON data={nodes} pointToLayer={pointToLayer} />
        <GeoJSON data={Viereck} pointToLayer={pointToLayer} />

        <MapContent />
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamic;
