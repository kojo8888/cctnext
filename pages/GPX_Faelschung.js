import React, { useState, useEffect } from "react";

export default function Home() {
  const [gpxData, setGpxData] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;

        try {
          const GPXModule = await import("gpx-parser-builder");
          const GPX = GPXModule.default ? GPXModule.default : GPXModule;
          const gpx = GPX.parse(text); // Parse the GPX file content from the uploaded file
          setGpxData(gpx);
        } catch (error) {
          console.error("Failed to parse GPX file:", error);
        }
      };
      reader.readAsText(file); // Read the file as text for parsing
    }
  };

  useEffect(() => {
    console.dir(gpxData);
  }, [gpxData]);

  const modifyGpxFile = () => {
    if (!gpxData || !gpxData.trk) {
      console.log("No track data found to modify.");
      return;
    }
    gpxData.trk.forEach((track) => {
      track.trkseg.forEach((segment) => {
        let increment = 0.3; // Start incrementing from 10 seconds
        segment.trkpt.forEach((point, index) => {
          // Assuming point.time is in a compatible format to be parsed as a Date
          const pointTime = new Date(point.time);
          // Increment the time by 10 seconds multiplied by the index (0-based) + 1
          pointTime.setSeconds(
            pointTime.getSeconds() - increment * (index + 1)
          );
          // Update the time in the original GPX data
          point.time = pointTime.toISOString();
        });
      });
    });
  };

  useEffect(() => {
    console.dir(gpxData);
  }, [gpxData]);

  // const countTimeElements = () => {
  //   if (!gpxData || !gpxData.trk) {
  //     console.log("No track data found to count.");
  //     return;
  //   }
  //   let timeCount = 0;
  //   gpxData.trk.forEach((track) => {
  //     track.trkseg.forEach((segment) => {
  //       segment.trkpt.forEach((point) => {
  //         if (point.time) {
  //           timeCount++;
  //         }
  //       });
  //     });
  //   });

  //   console.log(`Total number of <time> elements: ${timeCount}`);
  //   return timeCount; // Optional return, in case you need the count elsewhere
  // };

  const downloadModifiedGpxFile = () => {
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
    <div className="p-6">
      <p>
        <input type="file" onChange={handleFileUpload} accept=".gpx" />
      </p>
      <p>
        <button
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={modifyGpxFile}
        >
          Modify GPX File
        </button>
      </p>
      <p>
        <button
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={downloadModifiedGpxFile}
        >
          Download Modified GPX
        </button>
      </p>
      {/* <p>
        <button onClick={countTimeElements}>countTimeElements</button>
      </p> */}
    </div>
  );
}
