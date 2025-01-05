import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const directoryPath = path.join(process.cwd(), "public", "touren");

  try {
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory ${directoryPath} does not exist`);
      return res.status(404).json({ error: "Touren directory not found" });
    }

    const files = fs.readdirSync(directoryPath).filter((file) => file.endsWith(".gpx"));

    if (files.length === 0) {
      console.warn("No GPX files found in the directory");
      return res.status(404).json({ error: "No GPX files found" });
    }

    const gpxPaths = files.map((file) => `/touren/${file}`);
    res.status(200).json({ gpxFiles: gpxPaths });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).json({ error: "Failed to read GPX files" });
  }
}
