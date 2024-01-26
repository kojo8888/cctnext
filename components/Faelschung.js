import React, { useState, useEffect } from "react";
import { useMapEvent } from "react-leaflet/hooks";
import Bester from "../lib/Bester.gpx";
const gpxParse = require("gpx-parse");
const fs = require("fs");
const xml2js = require("xml2js");

// Function to adjust timestamps
const adjustTimestamp = (timestamp, decrement) => {
  const date = new Date(timestamp);
  date.setSeconds(date.getSeconds() - decrement);
  return date.toISOString();
};

const filePath = Bester;

// Function to modify GPX file
const Faelschung = (filePath, decrementPerPoint) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }

    gpxParse.parseGpx(data, (error, data) => {
      if (error) {
        console.error("Error parsing GPX data:", error);
        return;
      }

      // Assuming a simple structure, adjust as needed
      let decrement = 0;
      data.tracks.forEach((track) => {
        track.segments.forEach((segment) => {
          segment.forEach((point) => {
            point.time = adjustTimestamp(point.time, decrement);
            decrement += decrementPerPoint;
          });
        });
      });

      // Convert back to GPX format
      const builder = new xml2js.Builder();
      const xml = builder.buildObject(data);
      fs.writeFile("modified_gpx.gpx", xml, (err) => {
        if (err) {
          console.error("Error writing modified GPX:", err);
        } else {
          console.log('Modified GPX file saved as "modified_gpx.gpx".');
        }
      });
    });
  });
};

// Usage
Faelschung("./lib/Bester.gpx", 1); // Adjust the decrementPerPoint as needed
