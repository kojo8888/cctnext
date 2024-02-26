import React, { useState } from "react";

export default function Formlatlng() {
  const [formData, setFormData] = useState({
    SWlat: "",
    SWlong: "",
    NElat: "",
    NElong: "",
  });

  const handleInput = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;

    setFormData((prevState) => ({
      ...prevState,
      [fieldName]: fieldValue,
    }));
  };

  const submitForm = (e) => {
    // Prevent the default form submission behavior
    e.preventDefault();

    // Here you can handle the form data as you need
    // For example, log it to the console or update some state
    console.log(formData);

    // Optionally reset the form or set a success message
    setFormData({
      SWlat: "",
      SWlong: "",
      NElat: "",
      NElong: "",
    });
    // If you want to display a success message or perform other actions, add your logic here
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
    </div>
  );
}
