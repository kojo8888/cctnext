import fs from "fs";
import path from "path";
import gpxParse from "gpx-parse";
import xml2js from "xml2js";

export default function handler(req, res) {
  const filePath = path.resolve("./public/Bester.gpx");

  fs.readFile(filePath, "utf8", (err, rawXmlData) => {
    if (err) {
      console.error("Error reading file:", err);
      res.status(500).json({ error: "Error reading GPX file" });
      return;
    }

    // Log the raw XML data
    console.log("Raw XML Data:", rawXmlData);

    gpxParse.parseGpx(rawXmlData, (error, parsedData) => {
      if (error) {
        console.error("Error parsing GPX data:", error);
        res.status(500).json({ error: "Error parsing GPX file" });
        return;
      }

      // Log the parsed data structure
      console.log("Parsed GPX Data:", JSON.stringify(parsedData, null, 2));

      // Customize xml2js builder options if needed
      const builderOptions = {
        renderOpts: { pretty: true },
        headless: true, // Set to false if you want XML declaration (<?xml version="1.0" encoding="UTF-8"?>)
      };
      const builder = new xml2js.Builder(builderOptions);
      const xml = builder.buildObject(parsedData);

      res.setHeader("Content-Type", "application/gpx+xml");
      res.send(xml);
    });
  });
}
