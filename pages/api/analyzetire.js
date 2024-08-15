import Tesseract from "tesseract.js";
import formidable from "formidable";

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

    if (!files || !files.file || files.file.length === 0) {
      throw new Error("No file uploaded");
    }

    // Access the file buffer
    const imageBuffer = files.file[0].buffer;

    if (!imageBuffer) {
      throw new Error("Failed to extract buffer from the uploaded file");
    }

    // Debug: Log buffer size and type
    console.log("Buffer size:", imageBuffer.length);
    console.log("Buffer type:", typeof imageBuffer);

    // Use Tesseract.js to recognize text in the image
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");

    // Extract the tire size from the recognized text
    const tireSize = extractTireSize(text);

    // Generate the Amazon affiliate link based on the tire size
    const amazonLink = generateAmazonLink(tireSize);

    // Return the result as JSON
    return res.status(200).json({ tireSize, amazonLink });
  } catch (error) {
    console.error("Error during analysis:", error.message);
    return res.status(500).json({ error: "Failed to analyze image" });
  }
}

// Helper function to extract tire size from the recognized text
const extractTireSize = (text) => {
  const match = text.match(/\b\d{2,3}\/\d{2,3}\b/);
  return match ? match[0] : "Unknown";
};

// Helper function to generate Amazon affiliate link based on the tire size
const generateAmazonLink = (tireSize) => {
  const affiliateId = "your-affiliate-id"; // Replace with your actual Amazon affiliate ID
  const query = encodeURIComponent(`bike tire ${tireSize}`);
  return `https://www.amazon.com/s?k=${query}&tag=${affiliateId}`;
};

// Helper function to parse multipart/form-data using formidable
const parseFormData = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};
