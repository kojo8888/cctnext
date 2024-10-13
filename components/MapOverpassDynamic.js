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
  // Define different icons for each amenity
  const locationIcon = L.icon({
    iconUrl: "../platzhalter.png", // Replace with the path to your water icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const waterIcon = L.icon({
    iconUrl: "../trinkflasche.png", // Replace with the path to your water icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const repairIcon = L.icon({
    iconUrl: "../werkzeug.png", // Replace with the path to your bicycle repair station icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const vendingIcon = L.icon({
    iconUrl: "../vending-machine.png", // Replace with the path to your vending machine icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const [brunnenStations, setBrunnenStations] = useState(null);
  const [bicycleRepairStations, setBicycleRepairStations] = useState(null);
  const [vendingMachines, setVendingMachines] = useState(null);

  const mapRef = useRef();
  const location = useGeoLocation();
  const overpassApiUrl = "https://overpass-api.de/api/interpreter";

  // Function to create a dynamic query based on user's location
  const createOverpassQuery = (lat, lon, amenity, additionalTags = "") => {
    // Define the bounding box (0.15 lat/lon for a larger search area)
    const minLat = lat - 0.3;
    const maxLat = lat + 0.3;
    const minLon = lon - 0.3;
    const maxLon = lon + 0.3;

    // Return a dynamic query string for the bounding box and amenity
    return `
      [out:json];
      (
        node["amenity"="${amenity}"${additionalTags}](${minLat},${minLon},${maxLat},${maxLon});
      );
      out body;
    `;
  };

  // Query specific for vending machines with bicycle tubes
  const createVendingMachineQuery = (lat, lon) => {
    const minLat = lat - 0.3;
    const maxLat = lat + 0.3;
    const minLon = lon - 0.3;
    const maxLon = lon + 0.3;

    return `
      [out:json];
      node["amenity"="vending_machine"]["vending"~"bicycle_tube"](${minLat},${minLon},${maxLat},${maxLon});
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
      const drinkingWaterQuery = createOverpassQuery(
        location.coordinates.lat,
        location.coordinates.lng,
        "drinking_water"
      );
      const bicycleRepairQuery = createOverpassQuery(
        location.coordinates.lat,
        location.coordinates.lng,
        "bicycle_repair_station"
      );
      const vendingMachineQuery = createVendingMachineQuery(
        location.coordinates.lat,
        location.coordinates.lng
      );

      // Fetch data for each amenity
      fetchData(drinkingWaterQuery, setBrunnenStations);
      fetchData(bicycleRepairQuery, setBicycleRepairStations);
      fetchData(vendingMachineQuery, setVendingMachines);
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

  // Function to add custom markers with specific icons based on amenity
  const pointToLayer = (feature, latlng, amenityType) => {
    let icon;
    if (amenityType === "drinking_water") {
      icon = waterIcon;
    } else if (amenityType === "bicycle_repair_station") {
      icon = repairIcon;
    } else if (amenityType === "vending_machine") {
      icon = vendingIcon;
    }

    return L.marker(latlng, { icon });
  };

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
              icon={locationIcon} // Change the icon to user's location icon if needed
              position={[location.coordinates.lat, location.coordinates.lng]}
            ></Marker>
          )}
          <LayersControl position="topright">
            {brunnenStations && (
              <LayersControl.Overlay name="Drinking Water Stations">
                <GeoJSON
                  data={brunnenStations}
                  pointToLayer={(feature, latlng) =>
                    pointToLayer(feature, latlng, "drinking_water")
                  }
                />
              </LayersControl.Overlay>
            )}
            {bicycleRepairStations && (
              <LayersControl.Overlay name="Bicycle Repair Stations">
                <GeoJSON
                  data={bicycleRepairStations}
                  pointToLayer={(feature, latlng) =>
                    pointToLayer(feature, latlng, "bicycle_repair_station")
                  }
                />
              </LayersControl.Overlay>
            )}
            {vendingMachines && (
              <LayersControl.Overlay name="Vending Machines (Bicycle Tubes)">
                <GeoJSON
                  data={vendingMachines}
                  pointToLayer={(feature, latlng) =>
                    pointToLayer(feature, latlng, "vending_machine")
                  }
                />
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
};

export default MapOverpassDynamic;
