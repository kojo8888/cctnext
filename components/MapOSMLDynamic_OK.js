import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  GeoJSON,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMapEvent } from "react-leaflet/hooks";
import L from "leaflet";
import Kreis from "../lib/Kreis.json";

let DefaultIcon = L.icon({
  iconUrl: "../marker-icon.png",
  shadowUrl: "../marker-icon.png",
});

L.Marker.prototype.options.icon = DefaultIcon;

const DynamicMap = () => {
  const [circleCenter, setCircleCenter] = useState(null);
  const [circleRadius, setCircleRadius] = useState(10000); // Default radius in meters

  const setColor = ({ properties }) => {
    return { weight: 1 };
  };

  function MapContent({ map }) {
    const [markerPosition, setMarkerPosition] = useState(null);

    useMapEvent("click", (e) => {
      const { lat, lng } = e.latlng;
      console.log("Clicked at:", lat, lng);
      setMarkerPosition([lat, lng]);
    });

    return <>{markerPosition && <Marker position={markerPosition} />}</>;
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
        <GeoJSON data={Kreis} style={setColor} />
        <MapContent />
        {circleCenter && <Circle center={circleCenter} radius={circleRadius} />}
      </MapContainer>
      <div>
        <input
          type="range"
          min="10000"
          max="200000"
          step="1000"
          value={circleRadius}
          onChange={(e) => setCircleRadius(parseInt(e.target.value))}
        />
        <p>Circle Radius: {circleRadius} meters</p>
      </div>
    </div>
  );
};

export default DynamicMap;
