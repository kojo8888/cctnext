import React, { useState, useEffect } from "react";
import Head from "next/head";
import { FastForward } from "react-feather";

export default function Home() {
  const [gpxData, setGpxData] = useState(null);
  const [timeAdjustment, setTimeAdjustment] = useState(-0.3);
  const [hrAdjustment, setHrAdjustment] = useState();
  const [maxHR, setMaxHR] = useState(null);
  const [pmAdjustment, setPmAdjustment] = useState();

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
        segment.trkpt.forEach((point, index) => {
          // Time modification
          const pointTime = new Date(point.time);
          pointTime.setSeconds(
            pointTime.getSeconds() + parseFloat(timeAdjustment) * (index + 1)
          );
          point.time = pointTime.toISOString();

          // Heart rate modification, ensure the heart rate data exists
          if (
            point.extensions &&
            point.extensions["gpxtpx:TrackPointExtension"] &&
            point.extensions["gpxtpx:TrackPointExtension"]["gpxtpx:hr"]
          ) {
            let hr = parseInt(
              point.extensions["gpxtpx:TrackPointExtension"]["gpxtpx:hr"]
            );
            if (maxHR && hr > parseInt(maxHR)) {
              hr = parseInt(maxHR); // Cap the HR at maxHR if it's specified and exceeded
            }
            point.extensions["gpxtpx:TrackPointExtension"]["gpxtpx:hr"] =
              hr.toString();
          }

          // Heart rate modification, ensure the heart rate data exists
          if (
            point.extensions &&
            point.extensions["gpxtpx:TrackPointExtension"]
          ) {
            let hr = parseInt(
              point.extensions["gpxtpx:TrackPointExtension"]["gpxtpx:hr"]
            );
            hr += parseInt(hrAdjustment); // Adjusting the heart rate

            point.extensions["gpxtpx:TrackPointExtension"]["gpxtpx:hr"] =
              hr.toString();
          }

          // Power modification, ensure the heart rate data exists
          if (point.extensions && point.extensions["power"]) {
            let powerValue = parseInt(point.extensions["power"]);
            powerValue += parseInt(pmAdjustment);
            point.extensions["power"] = powerValue.toString();
          }
        });
      });
    });
  };

  useEffect(() => {
    console.dir(gpxData);
  }, [gpxData]);

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
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>GPX Fälschungswerkstatt</title>
        <meta
          name="description"
          content="Ändere die Zeit vom GPX Track"
          key="desc"
        />
        <meta property="og:title" content="Ändere die Zeit vom GPX Track" />
        <meta
          property="og:description"
          content="Ändere die Zeit vom GPX Track"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <FastForward color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          GPX Fälschungswerkstatt
        </p>
        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Bisschen die Performance tunen..
        </p>
      </div>

      <div className="mt-12 grid gap-8">
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6 text-xl">
            GPX Datei hochladen
          </p>
          <p className="flex justify-center mt-6">
            <input type="file" onChange={handleFileUpload} accept=".gpx" />
          </p>
        </div>

        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6 text-xl">
            Performance verbessern
          </p>
          <p className="mt-6">Geschwindigkeit</p>
          <p>
            <select
              value={timeAdjustment}
              onChange={(e) => setTimeAdjustment(e.target.value)}
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-3 rounded-lg"
            >
              <option value="-0.3">Minimal (-0.3)</option>
              <option value="-0.6">Ordentlich (-0.6)</option>
              <option value="-0.9">Ulle (-0.9)</option>
              <option value="-1.2">Max Kraft (-1.2)</option>
            </select>
          </p>
          <p className="mt-6">Herzfrequenz</p>
          <p>
            <select
              value={hrAdjustment}
              onChange={(e) => setHrAdjustment(e.target.value)}
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-3 rounded-lg"
            >
              <option value="-1">Minimal (-1)</option>
              <option value="-3">Ordentlich (-3)</option>
              <option value="-9">Ulle (-9)</option>
              <option value="-15">Max Kraft (-15)</option>
            </select>
            <input
              className="text-center font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-3 rounded-lg"
              type="number"
              name="maxHR"
              id="maxHR"
              placeholder="max HR"
              onChange={(e) => setMaxHR(e.target.value)}
            ></input>
          </p>
          <p className="mt-6">Watt</p>
          <p>
            <select
              value={pmAdjustment}
              onChange={(e) => setPmAdjustment(e.target.value)}
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-3 rounded-lg"
            >
              <option value="9">Minimal (9)</option>
              <option value="12">Ordentlich (12)</option>
              <option value="15">Ulle (15)</option>
              <option value="30">Max Kraft (30)</option>
            </select>
          </p>
        </div>

        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            Zeitpunkt ändern (in Arbeit..)
          </p>
        </div>

        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center text-xl mt-6">Fertig</p>
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
        </div>
      </div>

      <p className="mt-9">
        Zur Erklärung: Lade eine gpx Datei hoch, wähle einen Faktor zur
        Zeitreduzierung, dann auf modify klicken und herunterladen. Das Programm
        modifiziert derzeit alle Zeitstempel inkremental mit beispielsweise
        -0.3s.
      </p>
    </div>
  );
}
