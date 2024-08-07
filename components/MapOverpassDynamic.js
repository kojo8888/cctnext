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
import * as turf from "@turf/turf";
import "leaflet-routing-machine";
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
  const [brunnenStations, setBrunnenStations] = useState(null);
  const [schlauchStations, setSchlauchStations] = useState(null);
  const mapRef = useRef();
  const location = useGeoLocation();

  const overpassApiUrl = "https://overpass-api.de/api/interpreter";

  const overpassQuery = `
    [out:json];
    area["name"="Bayern"]->.searchArea;
    node["amenity"="bicycle_repair_station"](area.searchArea);
    out body;
  `;

  const overpassbrunnenQuery = `
    [out:json];
    area["name"="Friuli-Venezia Giulia"]->.searchArea;
    node["amenity"="drinking_water"](area.searchArea);
    out body;
  `;
  const overpassschlauchQuery = `
    [out:json];
    area["name"="Bayern"]->.searchArea;
    node["amenity"="vending_machine"](area.searchArea);
    node["vending"="bicycle_tube"](area.searchArea);
    out body;
  `;
  const fetchData = async (query, setData) => {
    try {
      const response = await axios.post(overpassApiUrl, query);
      const geojsonData = formatToGeoJSON(response.data);
      setData(geojsonData);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    }
  };
  useEffect(() => {
    // Fetch data for each dataset
    fetchData(overpassQuery, setRepairStations);
    fetchData(overpassbrunnenQuery, setBrunnenStations);
    fetchData(overpassschlauchQuery, setSchlauchStations);
  }, []);

  useEffect(() => {
    const fetchData = async (query, setData) => {
      try {
        const response = await axios.post(overpassApiUrl, query);
        const geojsonData = formatToGeoJSON(response.data);
        setData(geojsonData);
      } catch (error) {
        console.error("Error fetching data:", error.message);
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

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.leafletElement.whenReady(() => {
        // Code that requires the map object
      });
    }
  }, [mapRef]);

  const findNearestPoint = () => {
    let minDistance = Infinity;
    let nearestPoint = null;

    repairStations.features.forEach((feature) => {
      // Assuming that feature.geometry.coordinates are in [longitude, latitude] format
      const featureLatLng = L.latLng(
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0]
      );
      const locationLatLng = L.latLng(
        location.coordinates.lat,
        location.coordinates.lng
      );

      const distance = featureLatLng.distanceTo(locationLatLng);

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = feature.geometry.coordinates;
      }

      // Debugging: log each feature's distance
      console.log("Feature:", feature, "Distance:", distance);
    });

    console.log("Nearest Point:", nearestPoint);
    return nearestPoint;
  };

  const calculateAndShowRoute = () => {
    // Check if the map is available
    if (mapRef.current) {
      // Define your fixed start and end coordinates
      // const startPoint = { lat: 48.1351, lng: 11.582 }; // Replace with your start coordinates
      // const endPoint = { lat: 48.137154, lng: 11.576124 }; // Replace with your end coordinates
      const nearestPoint = findNearestPoint();
      L.Routing.control({
        waypoints: [
          L.latLng(location.coordinates.lat, location.coordinates.lng),
          L.latLng(nearestPoint[1], nearestPoint[0]),
        ],
        routeWhileDragging: true,
      }).addTo(mapRef.current);
    } else {
      alert("Map is not available.");
    }
  };

  return (
    <div className={styles.map}>
      <div>
        <MapContainer
          center={[48.13, 11.57]}
          zoom={9}
          style={{ width: "100%", height: "1000px" }}
          ref={mapRef}
          whenReady={() => {
            console.log("Map is ready");
            // You can also call calculateAndShowRoute here if it should execute immediately after map load
          }}
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
            {repairStations && (
              <LayersControl.Overlay checked name="Reparaturstation">
                <GeoJSON data={repairStations} pointToLayer={pointToLayer} />
              </LayersControl.Overlay>
            )}
            {brunnenStations && (
              <LayersControl.Overlay name="Brunnen">
                <GeoJSON data={brunnenStations} pointToLayer={pointToLayer} />
              </LayersControl.Overlay>
            )}
            {schlauchStations && (
              <LayersControl.Overlay name="Schlauchautomat">
                <GeoJSON data={schlauchStations} pointToLayer={pointToLayer} />
              </LayersControl.Overlay>
            )}
          </LayersControl>
          <MapContent />
        </MapContainer>
        <button onClick={calculateAndShowRoute}>Show Nearest Route</button>
      </div>
    </div>
  );
};

export default MapOverpassDynamic;
