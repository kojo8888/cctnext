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
        const response = await fetch("./Soller.gpx");
        const gpxFileContent = await response.text();

        // Parse the GPX file content
        const gpx = GPX.parse(gpxFileContent); // Adjust this line as necessary
        setGpxData(gpx);
      } catch (error) {
        console.error("Failed to fetch or parse GPX file:", error);
      }
    }

    loadAndParseGPX();
  }, []);

  useEffect(() => {
    console.dir(gpxData); // This will log the updated value after it changes
  }, [gpxData]);

  const modifyGpxFile = () => {
    setGpxData({ ...gpxData });
    console.log("GPX data modified.");

    // Serialize the modified GPX data to string
    const gpxDataString = gpxData.toString(); // Make sure gpxData has a toString() method
    console.log(gpxDataString);

    // Create a blob from the GPX string and generate a URL for it
    const blob = new Blob([gpxDataString], {
      type: "application/gpx+xml",
    });
    const href = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger the download
    const link = document.createElement("a");
    link.href = href;
    link.download = "modified-track.gpx"; // Name of the file to be downloaded
    document.body.appendChild(link);
    link.click();

    // Clean-up
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div>
      <button onClick={modifyGpxFile}>Modify GPX File</button>
    </div>
  );
}
