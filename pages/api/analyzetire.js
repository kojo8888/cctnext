import Tesseract from "tesseract.js";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Disable Next.js's default body parser
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Parse the form data to get the uploaded file
    const { files } = await parseFormData(req);

    if (!files || !files.file) {
      throw new Error("No file uploaded");
    }

    // Access the file buffer
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const imageBuffer = file.filepath
      ? await fs.promises.readFile(file.filepath)
      : file.buffer;

    if (!imageBuffer) {
      throw new Error("Failed to extract buffer from the uploaded file");
    }

    // Debug: Log buffer size and type
    console.log("Buffer size:", imageBuffer.length);
    console.log("Buffer type:", typeof imageBuffer);

    // Use Tesseract.js to recognize text in the image, using "eng" language
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");

    // Log the recognized text for debugging
    console.log("Recognized Text:", text);

    // Extract the tire size from the recognized text
    const tireSize = extractTireSize(text);

    // Log the extracted tire size for debugging
    console.log("Extracted Tire Size:", tireSize);

    // Return the extracted tire size as JSON
    return res.status(200).json({ tireSize });
  } catch (error) {
    console.error("Error during analysis:", error.message);
    return res.status(500).json({ error: "Failed to analyze image" });
  }
}

// Helper function to extract tire size from the recognized text
const extractTireSize = (text) => {
  // Improve the regular expression to match common tire size formats
  const match = text.match(/\b\d{2,3}\s*[-x/]\s*\d{1,3}\b/);
  return match ? match[0].replace(/\s+/g, "") : "Unknown";
};

// Helper function to parse multipart/form-data using formidable
const parseFormData = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

//TODO: Verbesserung benötigt (Rotation? Textbeschreibung? SW?)
