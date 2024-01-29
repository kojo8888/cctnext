import { useState, useEffect } from "react";
import jsonData from "../lib/ritzel.json"; // Adjust the path as necessary

export default function Home() {
  const [ritzelArray, setRitzelArray] = useState([]);
  const [kettenblattArray, setKettenblattArray] = useState([]);
  const [divisionResults, setDivisionResults] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [ükValues, setÜkValues] = useState([]);
  const [ühValues, setÜhValues] = useState([]);

  //Gegeben
  //Tabelle
  var wd = 632;
  var wb = 23;
  var Cad = 80;

  useEffect(() => {
    const ritzelData = jsonData.features
      .filter((feature) => feature.type === "Ritzel" && feature.id === "1")
      .flatMap((feature) => feature.Zaehne);
    const kettenblattData = jsonData.features
      .filter((feature) => feature.type === "Kettenblatt" && feature.id === "6")
      .flatMap((feature) => feature.Zaehne);
    setRitzelArray(ritzelData);
    setKettenblattArray(kettenblattData);

    //Übersetzung
    const divisork = kettenblattData[0];
    const Ük = ritzelData.map((element) => element / divisork);

    const divisorh = kettenblattData[1];
    const Üh = ritzelData.map((element) => element / divisorh);
    setÜkValues(Ük);
    setÜhValues(Üh);
    console.log(Ük);
    console.log(Üh);

    //Umfang in m
    var Umf;
    Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
    Umf = Number.parseFloat(Umf).toFixed(2);
    console.log(Umf);

    //Entfaltung,Development
    const Devk = Ük.map((element) => Umf / element);
    console.log(Devk);
    const Devh = Üh.map((element) => Umf / element);
    console.log(Devh);

    //Geschwindigkeit in km/h
    const vh = Devh.map((element) => (element * Cad * 60) / 1000);
    // vh = (Devh * parseInt(Cad) * 60) / 1000;
    // vh = Number.parseFloat(vh).toFixed(2);
    console.log(vh);
    const vk = Devk.map((element) => (element * Cad * 60) / 1000);
    // vk = (Devk * parseInt(Cad) * 60) / 1000;
    // vk = Number.parseFloat(vk).toFixed(2);
    console.log(vk);

    //Entfaltung bei Cad in m
    const sh = Üh.map((element) => Cad * Umf * element);
    console.log(sh);
    const sk = Ük.map((element) => Cad * Umf * element);
    console.log(sk);

    // //Bandbreite
    // var Bb;
    // var Gk;
    // var Gh;
    // Gk = ZRk / ZKk;
    // Gh = ZKh / ZRh;
    // Bb = Gk / Gh;
  }, []);

  return (
    <div>
      <h1>Ük and Üh Values</h1>
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
            <td>Ük</td>
            {ükValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Üh</td>
            {ühValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
