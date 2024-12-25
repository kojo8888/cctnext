import { useState, useEffect } from "react";
import Head from "next/head";
import { Disc } from "react-feather";
import tireData from "../lib/groessenbezeichnungen_reifen.json";
import {
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Typography,
} from "@mui/material";

export default function HomePage() {
  // State to track which option the user has selected
  const [selectedOption, setSelectedOption] = useState(null);

  // Handlers for each option
  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Reifengröße</title>
        <meta
          name="description"
          content="Finde den richtigen Schlauch oder Mantel"
          key="desc"
        />
        <meta property="og:title" content="Reifengröße" />
        <meta
          property="og:description"
          content="Finde den richtigen Schlauch oder Mantel"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Disc color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Um Reifenbreite
        </p>
        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Schlauch- und Mantelfinder..
        </p>
      </div>
      <div>
        <button
          className="mx-3 font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={() => handleOptionChange("upload")}
        >
          Foto auslesen
        </button>
        <button
          className="mx-3 font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={() => handleOptionChange("search")}
        >
          Suchen
        </button>
        <button
          className="mx-3 font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={() => handleOptionChange("dropdown")}
        >
          Auswahlmenü
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        {selectedOption === "upload" && <UploadPhoto />}
        {selectedOption === "search" && <SearchFunction />}
        {selectedOption === "dropdown" && <DropdownMenu />}
      </div>
    </div>
  );
}

// Component for uploading a photo of a bike tire
function UploadPhoto() {
  const [image, setImage] = useState(null);

  const handleImageUpload = (event) => {
    setImage(event.target.files[0]);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!image) return;

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await fetch("/api/analyzetire", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      alert(`Detected Tire Size: ${data.tireSize}`);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <h2>Upload Photo of Your Bike Tire</h2>
      <form onSubmit={handleFormSubmit}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <button type="submit">Analyze Image</button>
      </form>
    </div>
  );
}

// Component for search function
function SearchFunction() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    const searchQuery = `${searchTerm}`.trim();

    if (!searchQuery) {
      alert("Bitte etwas eintippen!");
      return;
    }

    // Replace spaces with "+" to create a valid search string
    const formattedQuery = encodeURIComponent(searchQuery);

    // Add your Amazon affiliate tag here
    const affiliateTag = "customcycling-20"; // Replace with your Amazon affiliate ID

    // Build the Amazon search URL with the search query and affiliate tag
    const amazonUrl = `https://www.amazon.de/s?k=${formattedQuery}&tag=${affiliateTag}`;

    // Open the Amazon search URL in a new tab
    window.open(amazonUrl, "_blank");
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <h2>Suchfunktion für Schlauch und Mantel mit Link zu Amazon</h2>
      <form
        className="flex flex-col"
        style={{ maxWidth: "500px", margin: "auto", padding: "20px" }}
        onSubmit={handleSearch}
      >
        <input
          className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
          type="text"
          placeholder="Bitte Mantel oder Schlauchgröße eintragen"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Suchen</button>
      </form>
      <p>
        Diese Seite verlinkt zu Amazon. Die Links sind mit Amazon Affiliate
        verbunden und der Betreiber enthält eine Kommission.
      </p>
    </div>
  );
}

// Component for choosing tire from a drop-down menu
function DropdownMenu() {
  const [reifenaussenmass, setReifenaussenmass] = useState("");
  const [etrtoMm, setEtrtoMm] = useState("");
  const [deutschZoll, setDeutschZoll] = useState("");
  const [franzMm, setFranzMm] = useState("");
  const [mantel, setMantel] = useState(false); // false = dry, true = wet

  const handleConditionChange = (e) => setMantel(e.target.checked);

  const handleDropdownChange = (event, setState) => {
    setState(event.target.value);
  };

  const handleDropdownSubmit = (event) => {
    event.preventDefault();
    // Build a search query based on the selected values
    const condition = mantel ? "Schlauch" : "Mantel";
    const searchQuery = `${reifenaussenmass || ""} ${etrtoMm || ""} ${
      deutschZoll || ""
    } ${franzMm || ""}${condition}`.trim();

    if (!searchQuery) {
      alert("Please select a size before proceeding!");
      return;
    }

    // Replace spaces with "+" to create a valid search string
    const formattedQuery = encodeURIComponent(searchQuery);

    // Add your Amazon affiliate tag here
    const affiliateTag = "customcycling-20"; // Replace with your Amazon affiliate ID

    // Build the Amazon search URL with the search query and affiliate tag
    const amazonUrl = `https://www.amazon.de/s?k=${formattedQuery}&tag=${affiliateTag}`;

    // Open the Amazon search URL in a new tab
    window.open(amazonUrl, "_blank");
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <h2>Wähle in einem der Fenster die gewünschte Größe aus</h2>
      <form
        onSubmit={handleDropdownSubmit}
        className="flex flex-col"
        style={{ maxWidth: "500px", margin: "auto", padding: "20px" }}
      >
        {/* Wet/Dry Condition Switch */}
        <FormControlLabel
          control={<Switch checked={mantel} onChange={handleConditionChange} />}
          label={`Was brauchste: ${mantel ? "Schlauch" : "Mantel"}`}
          style={{ marginTop: "20px" }}
        />

        {/* Reifenaussenmass Dropdown */}
        <label htmlFor="reifenaussenmass">Reifenaussenmaß</label>
        <select
          className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
          id="reifenaussenmass"
          value={reifenaussenmass}
          onChange={(e) => handleDropdownChange(e, setReifenaussenmass)}
        >
          <option value="">Größe wählen</option>
          {tireData.features.map((feature, index) => (
            <option key={index} value={feature.Reifenaussenmass}>
              {feature.Reifenaussenmass}
            </option>
          ))}
        </select>
        <br />
        {/* ETRTO mm Dropdown */}
        <label htmlFor="etrtoMm">ETRTO mm</label>
        <select
          className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
          id="etrtoMm"
          value={etrtoMm}
          onChange={(e) => handleDropdownChange(e, setEtrtoMm)}
        >
          <option value="">Größe wählen</option>
          {tireData.features.map((feature, index) => (
            <option key={index} value={feature["ETRTO mm"]}>
              {feature["ETRTO mm"]}
            </option>
          ))}
        </select>
        <br />
        {/* Deutsch Zoll Dropdown */}
        <label htmlFor="deutschZoll">Deutsche Zoll</label>
        <select
          className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
          id="deutschZoll"
          value={deutschZoll}
          onChange={(e) => handleDropdownChange(e, setDeutschZoll)}
        >
          <option value="">Größe wählen</option>
          {tireData.features.map((feature, index) => (
            <option key={index} value={feature["Deutsch Zoll"]}>
              {feature["Deutsch Zoll"]}
            </option>
          ))}
        </select>
        <br />

        {/* Franz. Dropdown //TODO:Auswahl funktioniert noch nicht*/}
        <label htmlFor="franzMm">Französich mm</label>
        <select
          className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
          id="franzMm"
          value={franzMm}
          onChange={(e) => handleDropdownChange(e, setDeutschZoll)}
        >
          <option value="">Größe wählen</option>
          {tireData.features.map((feature, index) => (
            <option key={index} value={feature["Franzoes. mm"]}>
              {feature["Franzoes. mm"]}
            </option>
          ))}
        </select>
        <br />
        <button
          className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          type="submit"
        >
          Choose
        </button>
      </form>
    </div>
  );
}
