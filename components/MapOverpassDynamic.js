import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// import OverPassLayer from "leaflet-overpass-layer";

import munich_fountains from "../lib/munich_fountains.geojson";

const MapOverpassDynamic = () => {
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
        zoom={1}
        style={{ width: "100%", height: "500px" }}
      >
        <TileLayer
          url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeoJSON data={munich_fountains} style={setColor} />
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamic;
