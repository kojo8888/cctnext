import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapOverpassDynamicMallorca = dynamic(() => import("./MapOverpassDynamicMallorca"), {
  loading: () => <p>Loading map...</p>,
  ssr: false, // This is important to prevent server-side rendering
});

const MapOverpassMallorca = () => {
  return <MapOverpassDynamicMallorca />;
};

export default MapOverpassMallorca;
