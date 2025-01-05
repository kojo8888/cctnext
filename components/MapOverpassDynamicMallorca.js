import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  LayersControl,
  Popup,
  LayerGroup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useGeoLocation from "../components/useGeoLocation";
import styles from "../styles/Home.module.css";

const locationIcon = L.icon({
  iconUrl: "/platzhalter.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const bikeIcon = L.icon({
  iconUrl: "/bike.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const GpxLoader = ({ gpxFilePath }) => {
  const map = useMap();

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet-omnivore").then((module) => {
        const omnivore = module.default || module;
        const gpxLayer = omnivore.gpx(gpxFilePath);
        gpxLayer.addTo(map);
      });
    }
  }, [gpxFilePath, map]);

  return null;
};

const MapOverpassDynamicMallorca = () => {
  const [gpxFiles, setGpxFiles] = useState([]);
  const [verleiher, setVerleiher] = useState([]);
  const location = useGeoLocation();
  
  // Fetch GPX files
  useEffect(() => {
    const fetchGpxFiles = async () => {
      try {
        const response = await fetch("/api/gpx-files");
  
        // Check if response is not JSON
        if (!response.ok) {
          const errorMessage = await response.text();
          console.error("Error fetching GPX files:", errorMessage);
          return;
        }
  
        const data = await response.json();
        console.log("GPX files fetched:", data.gpxFiles); // Log the fetched GPX files
        setGpxFiles(data.gpxFiles);
      } catch (error) {
        console.error("Error fetching GPX files:", error);
      }
    };
  
    fetchGpxFiles();
  }, []);

  // Load Verleiher (bike rental shops) from JSON
  useEffect(() => {
    const fetchVerleiherData = async () => {
     try {
        const response = await import("../lib/Mallorca_Radverleiher.json");
        const data = response.Tabellenblatt1;
        const verleiherList = Object.entries(data).map(([name, info]) => ({
          name,
          latitude: info.Latitude, // Convert to decimal degrees
          longitude: info.Longitude,
          website: info.Website || "#",
          address: info.Address || "No address available",
        }));
       setVerleiher(verleiherList);
      } catch (error) {
        console.error("Error loading bike rental shops:", error);
     }
   };
  fetchVerleiherData();
  }, []);

  return (
    <div className={styles.map}>
      <MapContainer
        center={[39.69, 3.01]} // Mallorca default center
        zoom={9}
        style={{ width: "100%", height: "100vh" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {location.loaded && !location.error && (
          <Marker
            icon={locationIcon}
            position={[location.coordinates.lat, location.coordinates.lng]}
          />
        )}
        <LayersControl position="topright">
          {gpxFiles.map((gpxFile, index) => (
            <LayersControl.Overlay key={index} name={`Track ${index + 1}`}>
              <GpxLoader gpxFilePath={gpxFile} />
            </LayersControl.Overlay>
          ))}
          {/* Verleiher Layer */}
          <LayersControl.Overlay name="Verleiher (Bike Rentals)">
            <LayerGroup>
              {verleiher.map((shop, index) => (
                <Marker
                  key={index}
                  icon={bikeIcon}
                  position={[shop.latitude, shop.longitude]}
                >
                  <Popup>
                    <strong>{shop.name}</strong>
                    <br />
                    <span>{shop.address}</span>
                    <br />
                    <a href={shop.website} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
};

export default MapOverpassDynamicMallorca;
