import React, { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// import OverPassLayer from "leaflet-overpass-layer";

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
        center={[51.505, -0.09]}
        zoom={10}
        style={{ width: "100%", height: "500px" }}
      >
        <TileLayer
          url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamic;
