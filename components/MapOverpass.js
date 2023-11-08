import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapOverpassDynamic = dynamic(() => import("./MapOverpassDynamic"), {
  loading: () => <p>Loading map...</p>,
  ssr: false, // This is important to prevent server-side rendering
});

const MapOverpass = () => {
  return <MapOverpassDynamic />;
};

export default MapOverpass;
