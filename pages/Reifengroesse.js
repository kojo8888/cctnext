import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Aperture } from "react-feather";

export default function Upload() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);

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

      if (!response.ok) {
        throw new Error("Server error: " + response.statusText);
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      alert("There was an error processing your request.");
    }
  };
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>GPX Fälschungswerkstatt</title>
        <meta
          name="description"
          content="Ändere die Zeit vom GPX Track"
          key="desc"
        />
        <meta property="og:title" content="Ändere die Zeit vom GPX Track" />
        <meta
          property="og:description"
          content="Ändere die Zeit vom GPX Track"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Aperture color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Um Reifenbreite
        </p>
        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Schlauch- und Mantelfinder..
        </p>
      </div>
      <h1>Upload a Bike Tire Image</h1>
      <form onSubmit={handleFormSubmit}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <button type="submit">Analyze Image</button>
      </form>

      {result && (
        <div>
          <h2>Result:</h2>
          <p>Detected Tire Size: {result.tireSize}</p>
          <a href={result.amazonLink} target="_blank" rel="noopener noreferrer">
            Buy on Amazon
          </a>
        </div>
      )}
    </div>
  );
}
