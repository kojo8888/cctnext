import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  GeoJSON,
} from "react-leaflet";
// import "leaflet/dist/leaflet.css";
import { useMapEvent } from "react-leaflet/hooks";
import L from "leaflet";
import Kreis from "../lib/Kreis.json";
import Ways from "../lib/Ways.json";
import Polygon from "../lib/Polygon.json";
import * as turf from "@turf/turf";

// Load and parse the GeoJSON files
// const waysGeoJSON = JSON.parse(fs.readFileSync("Ways.geojson", "utf8"));
// const polygonGeoJSON = JSON.parse(fs.readFileSync("Polygon.geojson", "utf8"));

// Function to extract coordinates from GeoJSON
function extractCoordinates(json) {
  const coordinates = [];
  json.features.forEach((feature) => {
    const geomType = feature.geometry.type;
    const geomCoords = feature.geometry.coordinates;

    switch (geomType) {
      case "Point":
        coordinates.push(geomCoords);
        break;
      case "LineString":
      case "MultiPoint":
        coordinates.push(...geomCoords);
        break;
      case "Polygon":
      case "MultiLineString":
        geomCoords.forEach((part) => coordinates.push(...part));
        break;
      case "MultiPolygon":
        geomCoords.forEach((polygon) => {
          polygon.forEach((part) => coordinates.push(...part));
        });
        break;
    }
  });
  return coordinates;
}

// Define your transformation parameters
const translationDistance = 6;
const translationDirection = 45;
const rotationAngle = 45;
const scalingFactor = 3;

// Apply transformations
let transformedPolygon = turf.transformScale(Polygon, scalingFactor);
transformedPolygon = turf.transformRotate(transformedPolygon, rotationAngle);
transformedPolygon = turf.transformTranslate(
  transformedPolygon,
  translationDistance,
  translationDirection
);

// Extract coordinates from both GeoJSON files
const waysCoords = extractCoordinates(Ways);
const polygonCoords = extractCoordinates(Polygon);
const transformedpolygonCoords = extractCoordinates(transformedPolygon);
console.log(waysCoords);
console.log(polygonCoords);
console.log(transformedpolygonCoords);

let DefaultIcon = L.icon({
  iconUrl: "../marker-icon.png",
  shadowUrl: "../marker-icon.png",
});

L.Marker.prototype.options.icon = DefaultIcon;

const DynamicMap = () => {
  const [circleCenter, setCircleCenter] = useState(null);
  const [circleRadius, setCircleRadius] = useState(10000); // Default radius in meters

  const setColor = ({ properties }) => {
    return { color: "green", weight: 1, fillColor: "yellow", fillOpacity: 0.5 };
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
        center={[48.15, 11.57]}
        zoom={12}
        style={{ width: "100%", height: "500px" }}
      >
        <TileLayer
          url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeoJSON data={Kreis} style={setColor} />
        <GeoJSON data={Polygon} style={setColor} />
        <GeoJSON data={transformedPolygon} style={setColor} />
        <GeoJSON data={Ways} style={setColor} />
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
