import Head from "next/head";
import { Settings } from "react-feather";
import { useState, useEffect, useRef } from "react";
import jsonData from "../lib/ritzel.json";
import Chart from "chart.js";

export default function Home() {
  const [ritzelNames, setRitzelNames] = useState([]);
  const [kettenblattNames, setKettenblattNames] = useState([]);
  const [selectedRitzel, setSelectedRitzel] = useState("");
  const [selectedKettenblatt, setSelectedKettenblatt] = useState("");
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
  const chartRef = useRef(null);
  const vhVkChartRef = useRef(null);
  const devhDevkChartRef = useRef(null);
  const shSkChartRef = useRef(null);

  useEffect(() => {
    const ritzels = jsonData.features
      .filter((feature) => feature.type === "Ritzel")
      .map((feature) => feature.name);
    const kettenblatts = jsonData.features
      .filter((feature) => feature.type === "Kettenblatt")
      .map((feature) => feature.name);
    setRitzelNames(ritzels);
    setKettenblattNames(kettenblatts);
  }, []);

  useEffect(() => {
    if (chartRef.current && ühValues.length > 0) {
      const ctx = chartRef.current.getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: ritzelArray,
          datasets: [
            {
              label: "Übersetzung groß",
              data: ühValues,
              fill: false,
              borderColor: "rgb(75, 192, 192)",
              tension: 0.1,
            },
            {
              label: "Übersetzung klein",
              data: ükValues,
              fill: false,
              borderColor: "rgb(75, 92, 192)",
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }, [ühValues, ükValues]);

  useEffect(() => {
    if (vhVkChartRef.current && VhValues.length > 0) {
      const ctxVhVk = vhVkChartRef.current.getContext("2d");
      new Chart(ctxVhVk, {
        type: "line",
        data: {
          labels: ritzelArray,
          datasets: [
            {
              label: "Geschwindigkeit groß (Vh)",
              data: VhValues,
              fill: false,
              borderColor: "rgb(255, 99, 32)",
              tension: 0.1,
            },
            {
              label: "Geschwindigkeit klein (Vk)",
              data: VkValues,
              fill: false,
              borderColor: "rgb(54, 162, 35)",
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }, [VhValues, VkValues]);

  useEffect(() => {
    if (devhDevkChartRef.current && DevhValues.length > 0) {
      const ctxDevhDevk = devhDevkChartRef.current.getContext("2d");
      new Chart(ctxDevhDevk, {
        type: "line",
        data: {
          labels: ritzelArray,
          datasets: [
            {
              label: "Entfaltung groß (Devh)",
              data: DevhValues,
              fill: false,
              borderColor: "rgb(155, 99, 132)",
              tension: 0.1,
            },
            {
              label: "Entfaltung klein (Devk)",
              data: DevkValues,
              fill: false,
              borderColor: "rgb(154, 162, 235)",
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }, [DevhValues, DevkValues]);

  useEffect(() => {
    if (shSkChartRef.current && ShValues.length > 0) {
      const ctxShSk = shSkChartRef.current.getContext("2d");
      new Chart(ctxShSk, {
        type: "line",
        data: {
          labels: ritzelArray,
          datasets: [
            {
              label: "Strecke groß (Sh)",
              data: ShValues,
              fill: false,
              borderColor: "rgb(255, 99, 132)",
              tension: 0.1,
            },
            {
              label: "Strecke klein (Sk)",
              data: SkValues,
              fill: false,
              borderColor: "rgb(54, 162, 235)",
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }, [ShValues, SkValues]);

  const handleRitzelChange = (event) => {
    setSelectedRitzel(event.target.value);
  };

  const handleKettenblattChange = (event) => {
    setSelectedKettenblatt(event.target.value);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const ritzelData = jsonData.features
      .filter(
        (feature) =>
          feature.type === "Ritzel" && feature.name === selectedRitzel
      )
      .flatMap((feature) => feature.Zaehne);
    const kettenblattData = jsonData.features
      .filter(
        (feature) =>
          feature.type === "Kettenblatt" && feature.name === selectedKettenblatt
      )
      .flatMap((feature) => feature.Zaehne);

    setRitzelArray(ritzelData);
    setKettenblattArray(kettenblattData);

    const divisorh = kettenblattData[1];
    const Üh = ritzelData.map((element) => element / divisorh);
    setÜhValues(Üh);
    console.log(Üh);
    const divisork = kettenblattData[0];
    const Ük = ritzelData.map((element) => element / divisork);
    setÜkValues(Ük);
    console.log(Ük);

    const Umf =
      ((parseInt(formData.wb) * 2 + parseInt(formData.wd)) * Math.PI) / 1000;
    console.log(Umf);

    const Devh = Üh.map((element) => Umf / element);
    console.log(Devh);
    setDevhValues(Devh);
    const Devk = Ük.map((element) => Umf / element);
    console.log(Devk);
    setDevkValues(Devk);

    const vh = Devh.map((element) => (element * formData.Cad * 60) / 1000);
    console.log(vh);
    setVhValues(vh);
    const vk = Devk.map((element) => (element * formData.Cad * 60) / 1000);
    console.log(vk);
    setVkValues(vk);

    const sh = Üh.map((element) => formData.Cad * Umf * element);
    console.log(sh);
    setShValues(sh);
    const sk = Ük.map((element) => formData.Cad * Umf * element);
    console.log(sk);
    setSkValues(sk);

    setTableData((prevTableData) => [...prevTableData, formData]);
    setFormData({ wd: "", wb: "", Cad: "" });
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
      <form onSubmit={handleSubmit}>
        <div className="flex flex-row">
          <div className="basis-1/3">
            <label className="block mb-1" htmlFor="wd">
              Laufraddurchmesser
            </label>
            <input
              className="text-center bg-white text-black w-20 p-3 mb-3 border border-solid rounded-lg"
              type="number"
              name="wd"
              value={formData.wd}
              onChange={handleInputChange}
              placeholder="wd"
            />
          </div>
          <div className="basis-1/3">
            <label className="block mb-1" htmlFor="wb">
              Reifenbreite
            </label>
            <input
              className="text-center bg-white text-black w-20 p-3 mb-3 border border-solid rounded-lg"
              type="number"
              name="wb"
              value={formData.wb}
              onChange={handleInputChange}
              placeholder="wb"
            />
          </div>
          <div className="basis-1/3">
            <label className="block mb-1" htmlFor="Cad">
              Trittfrequenz
            </label>
            <input
              className="text-center bg-white text-black w-20 p-3 mb-3 border border-solid rounded-lg"
              type="number"
              name="Cad"
              value={formData.Cad}
              onChange={handleInputChange}
              placeholder="Cad"
            />
          </div>
        </div>
        <div className="flex flex-row gap-3">
          <div>
            <label htmlFor="ritzel">Ritzel:</label>
            <select
              className="text-center bg-white text-black p-3 mb-3 border border-solid rounded-lg"
              name="ritzel"
              value={selectedRitzel}
              onChange={handleRitzelChange}
            >
              {ritzelNames.map((name, index) => (
                <option key={index} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="kettenblatt">Kettenblatt:</label>
            <select
              className="text-center bg-white text-black p-3 mb-3 border border-solid rounded-lg"
              name="kettenblatt"
              value={selectedKettenblatt}
              onChange={handleKettenblattChange}
            >
              {kettenblattNames.map((name, index) => (
                <option key={index} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="font-mono mt-1 mb-3 mx-auto text-center max-w-lg px-10">
          <button
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
            type="submit"
          >
            Rechnen
          </button>
        </div>
      </form>

      <div className="">
        <table className="table-auto">
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
              <td>Übersetzung groß</td>
              {ühValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td>Übersetzung klein</td>
              {ükValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>

            <tr>
              <td>Geschwindigkeit groß</td>
              {VhValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td>Geschwindigkeit klein</td>
              {VkValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td>Entwicklung groß</td>
              {DevhValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td>Entwicklung klein</td>
              {DevkValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td>Strecke groß</td>
              {ShValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td>Strecke klein</td>
              {SkValues.map((value, index) => (
                <td key={index}>{value.toFixed(2)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-1 max-w-3xl mx-auto">
        <div className="bg-white border rounded-2xl">
          <div
            className="chart-container mt-3 max-w-2xl mx-auto"
            style={{ position: "relative", height: "40vh", width: "80vw" }}
          >
            <canvas ref={chartRef}></canvas>
          </div>
          <div
            className="chart-container mt-3 max-w-2xl mx-auto"
            style={{ position: "relative", height: "40vh", width: "80vw" }}
          >
            <canvas ref={vhVkChartRef}></canvas>
          </div>
          <div
            className="chart-container mt-3 max-w-2xl mx-auto"
            style={{ position: "relative", height: "40vh", width: "80vw" }}
          >
            <canvas ref={devhDevkChartRef}></canvas>
          </div>
          <div
            className="chart-container mt-3 max-w-2xl mx-auto"
            style={{ position: "relative", height: "40vh", width: "80vw" }}
          >
            <canvas ref={shSkChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
