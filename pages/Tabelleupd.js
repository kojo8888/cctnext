import React, { useState } from "react";

const HomePage = () => {
  const [formData, setFormData] = useState({
    number1: "",
    number2: "",
    number3: "",
    number4: "",
    number5: "",
  });
  const [tableData, setTableData] = useState([]);
  const [sum, setSum] = useState(0);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));

    if (
      name === "number1" ||
      name === "number2" ||
      name === "number3" ||
      name === "number4" ||
      name === "number5"
    ) {
      const ZRh = parseInt(name === "number1" ? value : formData.number1);
      const ZKh = parseInt(name === "number2" ? value : formData.number2);
      const wd = parseInt(name === "number3" ? value : formData.number3);
      const wb = parseInt(name === "number4" ? value : formData.number4);
      const Cad = parseInt(name === "number5" ? value : formData.number5);
      // const totalSum = num1 + num2;
      //Gesucht
      //Bandbreite
      var Bb;
      //Geschwindigkeit
      let vh;
      let vk;
      //Übersetzung
      let Ü;
      let Üh;
      //Entfaltung,Development
      let Dev;
      var s;
      //Umfang
      var Umf;

      //
      var Gk;
      var Gh;
      var Devh;
      var Devk;
      var Üh;
      var Ük;

      //Übersetzung h
      Üh = parseInt(ZRh) / parseInt(ZKh);
      // Ük = parseInt(ZRk) / parseInt(ZKk);
      //Umfang in m
      Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
      Umf = Number.parseFloat(Umf).toFixed(2);
      //Entfaltung
      Devh = Umf / Üh;
      Devh = Number.parseFloat(Devh).toFixed(2);
      console.log(Devh);
      // Devk = Umf / Ük;
      // Devk = Number.parseFloat(Devk).toFixed(2);
      //Entfaltung bei Cad in m
      s = parseInt(Cad) * Umf * Üh;
      console.log(s);
      //Geschwindigkeit in km/h
      vh = (Devh * parseInt(Cad) * 60) / 1000;
      vh = Number.parseFloat(vh).toFixed(2);
      console.log(vh);
      const totalSum = vh;
      // vk = (Devk * parseInt(Cad) * 60) / 1000;
      // vk = Number.parseFloat(vk).toFixed(2);
      //Bandbreite
      // Gk = ZRk / ZKk;
      // Gh = ZKh / ZRh;
      // Bb = Gk / Gh;
      setSum(totalSum);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTableData((prevTableData) => [...prevTableData, formData]);
    setFormData({ name: "", age: "", country: "" });
  };

  return (
    <div>
      <h1>Form and Table Example</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          name="number1"
          value={formData.number1}
          onChange={handleInputChange}
          placeholder="ZR"
        />
        <input
          type="number"
          name="number2"
          value={formData.number2}
          onChange={handleInputChange}
          placeholder="ZK"
        />
        <input
          type="number"
          name="number3"
          value={formData.number3}
          onChange={handleInputChange}
          placeholder="wd"
        />
        <input
          type="number"
          name="number4"
          value={formData.number4}
          onChange={handleInputChange}
          placeholder="wb"
        />
        <input
          type="number"
          name="number5"
          value={formData.number5}
          onChange={handleInputChange}
          placeholder="Cad"
        />
        <button type="submit">Submit</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Number 1</th>
            <th>Number 2</th>
            <th>Number 3</th>
            <th>Number 4</th>
            <th>Number 5</th>
            <th>vr</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((data, index) => (
            <tr key={index}>
              <td>{data.number1}</td>
              <td>{data.number2}</td>
              <td>{data.number3}</td>
              <td>{data.number4}</td>
              <td>{data.number5}</td>
              <td>{data.sum}</td>
            </tr>
          ))}
          <tr>
            <td>{formData.number1}</td>
            <td>{formData.number2}</td>
            <td>{formData.number3}</td>
            <td>{formData.number4}</td>
            <td>{formData.number5}</td>
            <td>{sum}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default HomePage;
