const axios = require("axios");
const fs = require("fs");

// Define the Overpass query to fetch fountains in Munich
const overpassQuery = `
  [out:json];
  area["name"="München"]->.searchArea;
  node["amenity"="fountain"](area.searchArea);
  out body;
`;

// Define the Overpass API endpoint
const overpassApiUrl = "https://overpass-api.de/api/interpreter";

// Function to format Overpass API response to GeoJSON
function formatToGeoJSON(overpassResponse) {
  const geojsonFeatures = overpassResponse.elements.map((element) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [element.lon, element.lat],
    },
    properties: {
      id: element.id,
      tags: element.tags,
    },
  }));

  return {
    type: "FeatureCollection",
    features: geojsonFeatures,
  };
}

// Function to fetch data from Overpass API and save as GeoJSON
async function fetchData() {
  try {
    // Make a POST request to Overpass API
    const response = await axios.post(overpassApiUrl, overpassQuery);

    // Format the response to GeoJSON
    const geojsonData = formatToGeoJSON(response.data);

    // Save the GeoJSON data to a file (you can modify the filename as needed)
    fs.writeFileSync(
      "munich_fountains.geojson",
      JSON.stringify(geojsonData, null, 2)
    );

    console.log(
      "Data has been successfully fetched and saved to munich_fountains.geojson"
    );
  } catch (error) {
    console.error("Error fetching data from Overpass API:", error.message);
  }
}

// Call the fetchData function to initiate the data fetch
fetchData();
