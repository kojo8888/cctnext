import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const DynamicMap = dynamic(() => import("./DynamicMap"), {
  loading: () => <p>Loading map...</p>,
  ssr: false, // This is important to prevent server-side rendering
});

const LeafletMap = () => {
  return <DynamicMap />;
};

export default LeafletMap;
