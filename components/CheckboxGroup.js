import React, { useState } from "react";

const CheckboxGroup = ({ onCheckboxChange }) => {
  const [checkboxes, setCheckboxes] = useState({
    checkbox1: false,
    checkbox2: false,
    checkbox3: false,
    checkbox4: false,
  });

  const handleCheckboxChange = (name) => {
    setCheckboxes({
      ...checkboxes,
      [name]: !checkboxes[name],
    });
    onCheckboxChange(checkboxes);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          name="checkbox1"
          checked={checkboxes.checkbox1}
          onChange={() => handleCheckboxChange("checkbox1")}
        />
        Checkbox 1
      </label>
      <label>
        <input
          type="checkbox"
          name="checkbox2"
          checked={checkboxes.checkbox2}
          onChange={() => handleCheckboxChange("checkbox2")}
        />
        Checkbox 2
      </label>
      <label>
        <input
          type="checkbox"
          name="checkbox3"
          checked={checkboxes.checkbox3}
          onChange={() => handleCheckboxChange("checkbox3")}
        />
        Checkbox 3
      </label>
      <label>
        <input
          type="checkbox"
          name="checkbox4"
          checked={checkboxes.checkbox4}
          onChange={() => handleCheckboxChange("checkbox4")}
        />
        Checkbox 4
      </label>
    </div>
  );
};

export default CheckboxGroup;
