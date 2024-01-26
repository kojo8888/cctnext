import fs from "fs";
import path from "path";
import gpxParse from "gpx-parse";
import xml2js from "xml2js";

export default function handler(req, res) {
  // Path to the GPX file in the public directory
  const filePath = path.resolve("./public/Bester.gpx");

  // Read the file
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      res.status(500).json({ error: "Error reading GPX file" });
      return;
    }

    // Parse the GPX file
    gpxParse.parseGpx(data, (error, parsedData) => {
      if (error) {
        console.error("Error parsing GPX data:", error);
        res.status(500).json({ error: "Error parsing GPX file" });
        return;
      }

      // Modify the GPX data here
      // For now, let's just log it
      console.log(parsedData);

      // Convert the modified data back to GPX format
      const builder = new xml2js.Builder();
      const xml = builder.buildObject(parsedData);

      // Send the modified GPX data
      res.setHeader("Content-Type", "application/gpx+xml");
      res.send(xml);
    });
  });
}
