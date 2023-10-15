import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const DynamicMapOverpass = dynamic(() => import("./DynamicMapOverpass"), {
  loading: () => <p>Loading map...</p>,
  ssr: false, // This is important to prevent server-side rendering
});

const OverpassMap = () => {
  return <DynamicMapOverpass />;
};

export default OverpassMap;
