const axios = require("axios");
const fs = require("fs");

// Define the Overpass query to fetch fountains in Munich
const overpassQuery = `
  [out:json];
  area["name"="München"]->.searchArea;
  node["amenity"="drinking_water"](area.searchArea);
  out body;
`;

// Define the Overpass API endpoint
const overpassApiUrl = "https://overpass-api.de/api/interpreter";

// Function to fetch data from Overpass API
async function fetchData() {
  try {
    // Make a POST request to Overpass API
    const response = await axios.post(overpassApiUrl, overpassQuery);

    // Extract data from the response
    const data = response.data;

    // Save the data to a file (you can modify the filename as needed)
    fs.writeFileSync("munich_fountains.json", JSON.stringify(data, null, 2));

    console.log(
      "Data has been successfully fetched and saved to munich_fountains.json"
    );
  } catch (error) {
    console.error("Error fetching data from Overpass API:", error.message);
  }
}

// Call the fetchData function to initiate the data fetch
fetchData();
