import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useGeoLocation from "../components/useGeoLocation";
// import OverPassLayer from "leaflet-overpass-layer";
// import icon from "../node_modules/leaflet/dist/images/marker-icon.png";
// import iconShadow from "leaflet/dist/images/marker-shadow.png";
import munich_fountains from "../lib/munich_fountains.json";

const MapOverpassDynamic = () => {
  const mapRef = useRef();

  const location = useGeoLocation();
  const markerIcon = L.icon({
    iconUrl: "../marker-icon.png",
    iconSize: [64, 64], // Adjust the size of the icon
    iconAnchor: [16, 32], // Adjust the anchor point of the icon
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
      iconUrl: "../marker-icon.png",
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
        style={{ width: "100%", height: "500px" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {location.loaded && !location.error && (
          <Marker
            icon={markerIcon}
            position={[location.coordinates.lat, location.coordinates.lng]}
          ></Marker>
        )}

        <GeoJSON data={munich_fountains} pointToLayer={pointToLayer} />
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamic;
