import React, { useState } from "react";

export default function Formlatlng() {
  const [formData, setFormData] = useState({
    SWlat: "",
    SWlong: "",
    NElat: "",
    NElong: "",
  });
  const [segments, setSegments] = useState(null); // State to store fetched segments
  const [loading, setLoading] = useState(false); // State to track loading status

  const handleInput = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;
    setFormData((prevState) => ({
      ...prevState,
      [fieldName]: fieldValue,
    }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true while fetching data

    const bounds = `${formData.SWlat},${formData.SWlong},${formData.NElat},${formData.NElong}`;
    const response = await fetch(
      `/api/Strava/stravafetchsegments?bounds=${bounds}`
    );
    if (response.ok) {
      const data = await response.json();
      setSegments(data); // Store the fetched segments in state
    } else {
      console.error("Failed to fetch segments");
      setSegments(null); // Reset segments state in case of an error
    }

    setLoading(false); // Set loading to false after fetching data
    // Optionally reset the form or handle the response further
  };

  return (
    <div>
      <form onSubmit={submitForm}>
        <div>
          <label>SW lat</label>
          <input
            type="text"
            name="SWlat"
            onChange={handleInput}
            value={formData.SWlat}
          />
        </div>

        <div>
          <label>SW long</label>
          <input
            type="text"
            name="SWlong"
            onChange={handleInput}
            value={formData.SWlong}
          />
        </div>

        <div>
          <label>NE lat</label>
          <input
            type="text"
            name="NElat"
            onChange={handleInput}
            value={formData.NElat}
          />
        </div>

        <div>
          <label>NE long</label>
          <input
            type="text"
            name="NElong"
            onChange={handleInput}
            value={formData.NElong}
          />
        </div>

        <button type="submit">Ab die Post</button>
      </form>
      {loading && <p>Loading segments...</p>}
      {segments && (
        <div>
          <h2>Segments</h2>
          {segments.map((segment) => (
            <div key={segment.id}>
              <p>Name: {segment.name}</p>
              <p>Distance: {segment.distance}</p>
              {/* Display additional segment details here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
