import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMapEvent } from "react-leaflet/hooks";

const DynamicMap = () => {
  const [circleCenter, setCircleCenter] = useState(null);
  const [circleRadius, setCircleRadius] = useState(10000); // Default radius in meters

  function MapContent({ customIcon }) {
    const [markerPosition, setMarkerPosition] = useState(null);

    const map = useMapEvent("click", (e) => {
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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapContent />
      </MapContainer>
      <div>
        <input
          type="range"
          min="10000"
          max="200000"
          step="1000"
          value={circleRadius}
          onChange={(e) => setCircleRadius(e.target.value)}
        />
        <p>Circle Radius: {circleRadius} meters</p>
      </div>
      <div id="map"></div>
    </div>
  );
};

export default DynamicMap;
