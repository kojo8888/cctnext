import { useState } from "react";
import Head from "next/head";
import { Disc } from "react-feather";

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
          Upload Photo of Bike Tire
        </button>
        <button
          className="mx-3 font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={() => handleOptionChange("search")}
        >
          Search Function
        </button>
        <button
          className="mx-3 font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
          onClick={() => handleOptionChange("dropdown")}
        >
          Choose from Drop-down Menu
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
      const response = await fetch("/api/analyze", {
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
    // Add logic for searching the term here
    alert(`Searching for: ${searchTerm}`);
  };

  return (
    <div>
      <h2>Search for a Bike Tire</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter tire size or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
    </div>
  );
}

// Component for choosing tire from a drop-down menu
function DropdownMenu() {
  const [selectedTire, setSelectedTire] = useState("");

  const handleDropdownChange = (event) => {
    setSelectedTire(event.target.value);
  };

  const handleDropdownSubmit = (event) => {
    event.preventDefault();
    alert(`You selected: ${selectedTire}`);
  };

  return (
    <div>
      <h2>Choose Tire from Drop-down Menu</h2>
      <form onSubmit={handleDropdownSubmit}>
        <select value={selectedTire} onChange={handleDropdownChange}>
          <option value="">Select a tire size</option>
          <option value="700x25c">700x25c</option>
          <option value="26x1.95">26x1.95</option>
          <option value="29x2.1">29x2.1</option>
          <option value="27.5x2.2">27.5x2.2</option>
        </select>
        <button type="submit">Choose</button>
      </form>
    </div>
  );
}
