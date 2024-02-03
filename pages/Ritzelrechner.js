import Head from "next/head";
import { Settings } from "react-feather";
import { useState, useEffect } from "react";
import jsonData from "../lib/ritzel.json"; // Adjust the path as necessary

export default function Home() {
  const [ritzelArray, setRitzelArray] = useState([]);
  const [kettenblattArray, setKettenblattArray] = useState([]);
  const [divisionResults, setDivisionResults] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [ükValues, setÜkValues] = useState([]);
  const [ühValues, setÜhValues] = useState([]);
  const [DevkValues, setDevkValues] = useState([]);
  const [DevhValues, setDevhValues] = useState([]);
  const [VhValues, setVhValues] = useState([]);
  const [VkValues, setVkValues] = useState([]);
  const [ShValues, setShValues] = useState([]);
  const [SkValues, setSkValues] = useState([]);

  const [formData, setFormData] = useState({
    wd: "",
    wb: "",
    Cad: "",
  });

  //Gegeben
  //Tabelle
  var wd = 632;
  var wb = 23;
  var Cad = 80;
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));

    // useEffect(() => {
    const ritzelData = jsonData.features
      .filter((feature) => feature.type === "Ritzel" && feature.id === "1")
      .flatMap((feature) => feature.Zaehne);
    const kettenblattData = jsonData.features
      .filter((feature) => feature.type === "Kettenblatt" && feature.id === "6")
      .flatMap((feature) => feature.Zaehne);
    setRitzelArray(ritzelData);
    setKettenblattArray(kettenblattData);

    //Übersetzung
    const divisorh = kettenblattData[1];
    const Üh = ritzelData.map((element) => element / divisorh);
    setÜhValues(Üh);
    console.log(Üh);
    const divisork = kettenblattData[0];
    const Ük = ritzelData.map((element) => element / divisork);
    setÜkValues(Ük);
    console.log(Ük);

    //Umfang in m
    var Umf;
    Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
    Umf = Number.parseFloat(Umf).toFixed(2);
    console.log(Umf);

    //Entfaltung,Development
    const Devh = Üh.map((element) => Umf / element);
    console.log(Devh);
    setDevhValues(Devh);
    const Devk = Ük.map((element) => Umf / element);
    console.log(Devk);
    setDevkValues(Devk);

    //Geschwindigkeit in km/h
    const vh = Devh.map((element) => (element * Cad * 60) / 1000);
    // vh = (Devh * parseInt(Cad) * 60) / 1000;
    // vh = Number.parseFloat(vh).toFixed(2);
    console.log(vh);
    setVhValues(vh);
    const vk = Devk.map((element) => (element * Cad * 60) / 1000);
    // vk = (Devk * parseInt(Cad) * 60) / 1000;
    // vk = Number.parseFloat(vk).toFixed(2);
    console.log(vk);
    setVkValues(vk);

    //Entfaltung bei Cad in m
    const sh = Üh.map((element) => Cad * Umf * element);
    console.log(sh);
    setShValues(sh);
    const sk = Ük.map((element) => Cad * Umf * element);
    console.log(sk);
    setSkValues(sk);

    // //Bandbreite
    // var Bb;
    // var Gk;
    // var Gh;
    // Gk = ZRk / ZKk;
    // Gh = ZKh / ZRh;
    // Bb = Gk / Gh;
    // }, []);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTableData((prevTableData) => [...prevTableData, formData]);
    setFormData({ name: "", age: "", country: "" });
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Tools</title>
        <meta
          name="description"
          content="Fahrradtouren, GPX Strecken und Packlisten für Rennradfahrer"
          key="desc"
        />
        <meta property="og:title" content="Nützliche Tools für Radler" />
        <meta
          property="og:description"
          content="Ritzelrechner, Gaenge, Kettenblatt, Schaltung, Uebersetzung"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Settings color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Ritzelrechner!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Dieser Ritzelrechner zeigt dir, welche Gänge welche Übersetzung haben.
        </p>
      </div>
      <h1>Gangwahl:</h1>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-row gap-3">
          <div className="basis-1/3">
            <label className="block mb-1" htmlFor="wd">
              wd
            </label>
            <input
              className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
              type="number"
              name="wd"
              value={formData.wd}
              onChange={handleInputChange}
              placeholder="wd"
            />
            <label className="block mb-1" htmlFor="wb">
              wb
            </label>
            <input
              className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
              type="number"
              name="wb"
              value={formData.wb}
              onChange={handleInputChange}
              placeholder="wb"
            />
            <label className="block mb-1" htmlFor="Cad">
              Cad
            </label>
            <input
              className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
              type="number"
              name="Cad"
              value={formData.Cad}
              onChange={handleInputChange}
              placeholder="Cad"
            />
          </div>
        </div>
        <div className="font-mono mt-1 mb-3 mx-auto text-center max-w-lg px-10">
          <button
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
            type="submit"
          >
            Submit
          </button>
        </div>
      </form>
      <h1>Ergebnis:</h1>
      <table>
        <thead>
          <tr>
            <th>Ritzel</th>
            {ritzelArray.map((ritzel, index) => (
              <th key={index}>{ritzel}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Üh</td>
            {ühValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Ük</td>
            {ükValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>

          <tr>
            <td>Vh</td>
            {VhValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Vk</td>
            {VkValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Devh</td>
            {DevhValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Devk</td>
            {DevkValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Sh</td>
            {ShValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Sk</td>
            {SkValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
