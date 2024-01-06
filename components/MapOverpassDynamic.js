import React, { useState, useEffect, useRef } from "react";
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
import axios from "axios";

const MapOverpassDynamic = () => {
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

  const [repairStations, setRepairStations] = useState(null);
  const mapRef = useRef();
  const location = useGeoLocation();

  const overpassApiUrl = "https://overpass-api.de/api/interpreter";
  const overpassQuery = `
    [out:json];
    area["name"="Deutschland"]->.searchArea;
    node["amenity"="drinking_water"](area.searchArea);
    out body;
  `;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post(overpassApiUrl, overpassQuery);
        const geojsonData = formatToGeoJSON(response.data);
        setRepairStations(geojsonData);
      } catch (error) {
        console.error("Error fetching data from Overpass API:", error.message);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs once on mount

  // Function to format Overpass API response to GeoJSON
  function formatToGeoJSON(overpassResponse) {
    const geojsonFeatures = overpassResponse.elements.map((element) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [element.lon, element.lat],
      },
      properties: {
        id: element.id,
        tags: element.tags,
      },
    }));

    return {
      type: "FeatureCollection",
      features: geojsonFeatures,
    };
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
        {/* <GeoJSON data={munich_fountains} pointToLayer={pointToLayer} /> */}
        <LayersControl position="topright">
          {/* <LayersControl.Overlay name="Schlauchautomat">
            <GeoJSON data={schlauchautomat} pointToLayer={pointToLayer} />
          </LayersControl.Overlay> */}
          {repairStations && (
            <LayersControl.Overlay checked name="Reparaturstation">
              <GeoJSON data={repairStations} pointToLayer={pointToLayer} />
            </LayersControl.Overlay>
          )}
        </LayersControl>
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamic;
