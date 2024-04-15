import React, { useState, useEffect } from "react";

export default function Home() {
  const [gpxData, setGpxData] = useState(null);
  const [originalGpxDataString, setOriginalGpxDataString] = useState("");

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
        const gpx = GPX.parse(gpxFileContent); // Adjust this line as necessary
        setGpxData(gpx);
        setOriginalGpxDataString(gpxFileContent);
        // console.log(gpx);
        // console.dir(gpx.metadata);
        // console.dir(gpx.wpt);
        // console.dir(gpxData);
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
    if (!gpxData || !gpxData.trk) {
      console.log("No track data found to modify.");
      return;
    }

    gpxData.trk.forEach((track) => {
      track.trkseg.forEach((segment) => {
        segment.trkpt.forEach((point, index) => {
          // Assuming point.time is in a compatible format to be parsed as a Date
          const pointTime = new Date(point.time);
          // Decrease the time by one second for each point
          pointTime.setSeconds(pointTime.getSeconds() - 15);
          // Update the time in the original GPX data
          point.time = pointTime.toISOString();
        });
      });
    });

    // After modification, you might want to update the state or handle the modified data somehow
    //This causes problems!
    setGpxData({ ...gpxData });
    //
    console.log("GPX data modified.");
    console.log(gpxData);
    console.log(JSON.stringify(gpxData, null, 2));
    console.log(JSON.stringify(originalGpxDataString, null, 2));
  };

  const downloadModifiedGpxFile = () => {
    if (!gpxData) {
      console.error("No GPX data available to download.");
      return;
    }

    // Serialize the modified GPX data to string
    const gpxDataString = gpxData.toString(); // Make sure gpxData has a toString() method
    console.log(gpxData.toString());

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
      <button onClick={downloadModifiedGpxFile}>Download Modified GPX</button>
    </div>
  );
}
