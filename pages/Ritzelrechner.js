import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import ritzelrechner from "../ritzelrechner.json";
import Head from "next/head";
import { useState } from "react";

// const options = ["Italy", "Spain", "Greece"];
const options = JSON.parse(ritzelrechner);
const test = options.name[0];

function DropdownForm() {
  const [selected, setSelected] = useState(options[0]);
  const submit = () => {
    console.log(selected);
  };

  return (
    <form>
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        {options.map((value) => (
          <option value={value} key={value}>
            {value}
          </option>
        ))}
      </select>
      <button type="button" onClick={submit}>
        Submit
      </button>
    </form>
  );
}
export default DropdownForm;
