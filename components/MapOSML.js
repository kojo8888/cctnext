import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapOSMLDynamic = dynamic(() => import("./MapOSMLDynamic"), {
  loading: () => <p>Loading map...</p>,
  ssr: false, // This is important to prevent server-side rendering
});

const MapOSML = () => {
  return <MapOSMLDynamic />;
};

export default MapOSML;
