import React, { useState, useEffect } from "react";

export default function Home() {
  const [gpxData, setGpxData] = useState(null);

  useEffect(() => {
    async function loadAndParseGPX() {
      try {
        // Dynamically import the GPX module
        const GPXModule = await import("gpx-parser-builder");
        const GPX = GPXModule.default ? GPXModule.default : GPXModule;

        // Fetch the GPX file content
        const response = await fetch("./Bester.gpx");
        const gpxFileContent = await response.text();

        // Parse the GPX file content
        // Adjust this line based on the actual API of gpx-parser-builder
        const gpx = GPX.parse(gpxFileContent); // Adjust this line as necessary
        setGpxData(gpx);
        console.dir(gpx);
        console.dir(gpxData);
        // console.dir(gpx.trk);
      } catch (error) {
        console.error("Failed to fetch or parse GPX file:", error);
      }
    }

    loadAndParseGPX();
  }, []);

  const modifyGpxFile = () => {
    // if (!gpxData || !gpxData.tracks) {
    //   console.error("No GPX data or tracks available to modify.");
    //   return;
    // }
    // // Clone the original GPX data to avoid direct state mutation
    // const modifiedGpxData = JSON.parse(JSON.stringify(gpxData));
    // modifiedGpxData.trk.forEach((track) => {
    //   track.trkseg.forEach((segment) => {
    //     segment.trkpt.forEach((point) => {
    //       if (point.time) {
    //         // Parse the time, add one second, and set it back in ISO string format
    //         const originalTime = new Date(point.time);
    //         const modifiedTime = new Date(originalTime.getTime() + 1000); // Add 1000 milliseconds
    //         point.time = modifiedTime.toISOString();
    //       }
    //     });
    //   });
    // });
    // // Update state with modified GPX data
    // setGpxData(modifiedGpxData);
  };

  return (
    <div>
      <button onClick={modifyGpxFile}>Modify GPX File</button>
    </div>
  );
}
