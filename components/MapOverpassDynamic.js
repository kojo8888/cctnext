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
import styles from "../styles/Home.module.css";

const MapOverpassDynamic = () => {
  const markerIcon = L.icon({
    iconUrl: "../platzhalter.png",
    iconSize: [64, 64], // Adjust the size of the icon
    iconAnchor: [32, 64], // Adjust the anchor point of the icon
    popupAnchor: [0, -32], // Adjust the popup anchor point
  });

  const [brunnenStations, setBrunnenStations] = useState(null);
  const mapRef = useRef();
  const location = useGeoLocation();
  const overpassApiUrl = "https://overpass-api.de/api/interpreter";

  // Function to create a dynamic query based on user's location
  const createOverpassQuery = (lat, lon) => {
    // Define the bounding box (0.1 lat/lon)
    const minLat = lat - 0.15;
    const maxLat = lat + 0.15;
    const minLon = lon - 0.15;
    const maxLon = lon + 0.15;

    // Return a dynamic query string for the bounding box
    return `
      [out:json];
      (
        node["amenity"="drinking_water"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out body;
    `;
  };

  const fetchData = async (query, setData) => {
    try {
      const response = await axios.post(overpassApiUrl, query);
      const geojsonData = formatToGeoJSON(response.data);
      setData(geojsonData);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    }
  };

  // Fetch data when location is loaded and changes
  useEffect(() => {
    if (location.loaded && !location.error) {
      const query = createOverpassQuery(
        location.coordinates.lat,
        location.coordinates.lng
      );
      fetchData(query, setBrunnenStations);
    }
  }, [location]);

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
    <div className={styles.map}>
      <div>
        <MapContainer
          center={[48.13, 11.57]} // Default center if geolocation fails
          zoom={9}
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
          <LayersControl position="topright">
            {brunnenStations && (
              <LayersControl.Overlay name="Brunnen">
                <GeoJSON data={brunnenStations} />
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
};

export default MapOverpassDynamic;
