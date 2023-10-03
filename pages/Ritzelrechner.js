import React, { useState } from "react";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";

const HomePage = () => {
  const [formData, setFormData] = useState({
    ZRh: "",
    ZRk: "",
    ZKh: "",
    ZKk: "",
    wd: "",
    wb: "",
    Cad: "",
  });
  const [tableData, setTableData] = useState([]);
  const [vh, setvh] = useState(0);
  const [vk, setvk] = useState(0);
  const [sh, setsh] = useState(0);
  const [sk, setsk] = useState(0);
  const [Devh, setDevh] = useState(0);
  const [Devk, setDevk] = useState(0);
  const [Umf, setUmf] = useState(0);
  const [Üh, setÜh] = useState(0);
  const [Ük, setÜk] = useState(0);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));

    if (
      name === "ZRh" ||
      name === "ZRk" ||
      name === "ZKh" ||
      name === "ZKk" ||
      name === "wd" ||
      name === "wb" ||
      name === "Cad"
    ) {
      const ZRh = parseInt(name === "ZRh" ? value : formData.ZRh);
      const ZRk = parseInt(name === "ZRk" ? value : formData.ZRk);
      const ZKh = parseInt(name === "ZKh" ? value : formData.ZKh);
      const ZKk = parseInt(name === "ZKk" ? value : formData.ZKk);
      const wd = parseInt(name === "wd" ? value : formData.wd);
      const wb = parseInt(name === "wb" ? value : formData.wb);
      const Cad = parseInt(name === "Cad" ? value : formData.Cad);
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
      var sh;
      var sk;
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
      // console.log(Üh);
      setÜh(Üh);
      Ük = parseInt(ZRk) / parseInt(ZKk);
      setÜk(Ük);
      //Umfang in m
      Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
      Umf = Number.parseFloat(Umf).toFixed(2);
      console.log(Umf);
      setUmf(Umf);
      //Entfaltung
      Devh = Umf / Üh;
      Devh = Number.parseFloat(Devh).toFixed(2);
      // console.log(Devh);
      setDevh(Devh);
      Devk = Umf / Ük;
      Devk = Number.parseFloat(Devk).toFixed(2);
      setDevk(Devk);
      //Entfaltung bei Cad in m
      sh = parseInt(Cad) * Umf * Üh;
      // console.log(s);
      setsh(sh);
      sk = parseInt(Cad) * Umf * Ük;
      // console.log(s);
      setsk(sk);
      //Geschwindigkeit in km/h
      vh = (Devh * parseInt(Cad) * 60) / 1000;
      vh = Number.parseFloat(vh).toFixed(2);
      // console.log(vh);
      setvh(vh);
      vk = (Devk * parseInt(Cad) * 60) / 1000;
      vk = Number.parseFloat(vk).toFixed(2);
      setvk(vk);
      //Bandbreite
      // Gk = ZRk / ZKk;
      // Gh = ZKh / ZRh;
      // Bb = Gk / Gh;
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTableData((prevTableData) => [...prevTableData, formData]);
    setFormData({ name: "", age: "", country: "" });
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Ritzelrechner</title>
      </Head>
      {/* <HeaderComponent></HeaderComponent> */}
      <div className="font-mono mt-10 text-center">
        <div className="mb-3 text-xl font-bold">Ritzelrechner</div>
        <form onSubmit={handleSubmit}>
          <div class="flex flex-row gap-3">
            <div class="basis-1/3">
              <label className="block mb-1" htmlFor="ZKh">
                ZKh
              </label>
              <input
                className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
                type="number"
                name="ZKh"
                value={formData.ZKh}
                onChange={handleInputChange}
                placeholder="ZKh"
              />
              <label className="block mb-1" htmlFor="ZKk">
                ZKk
              </label>
              <input
                className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
                type="number"
                name="ZKk"
                value={formData.ZKk}
                onChange={handleInputChange}
                placeholder="ZKk"
              />
            </div>
            <div class="basis-1/3">
              <label className="block mb-1" htmlFor="ZRh">
                ZRh
              </label>
              <input
                className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
                type="number"
                name="ZRh"
                value={formData.ZRh}
                onChange={handleInputChange}
                placeholder="ZRh"
              />
              <label className="block mb-1" htmlFor="ZRk">
                ZRk
              </label>
              <input
                className="text-center w-20 p-3 mb-3 border border-gray-400 border-solid rounded-lg"
                type="number"
                name="ZRk"
                value={formData.ZRk}
                onChange={handleInputChange}
                placeholder="ZRk"
              />
            </div>
            <div class="basis-1/3">
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
        <table>
          <thead>
            <tr>
              {/* <th>Number 1</th>
            <th>Number 2</th>
            <th>Number 3</th>
            <th>Number 4</th>
            <th>Number 5</th> */}
              <th>Üh</th>
              <th>Ük</th>
              <th>Umf</th>
              <th>vh</th>
              <th>vk</th>
              <th>sh</th>
              <th>sk</th>
              <th>Devh</th>
              <th>Devk</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((data, index) => (
              <tr key={index}>
                {/* <td>{data.number1}</td>
              <td>{data.number2}</td>
              <td>{data.number3}</td>
              <td>{data.number4}</td>
              <td>{data.number5}</td> */}
                <td>{data.Üh}</td>
                <td>{data.Ük}</td>
                <td>{data.Umf}</td>
                <td>{data.vh}</td>
                <td>{data.vk}</td>
                <td>{data.sh}</td>
                <td>{data.sk}</td>
                <td>{data.Devh}</td>
                <td>{data.Devk}</td>
              </tr>
            ))}
            <tr>
              {/* <td>{formData.number1}</td>
            <td>{formData.number2}</td>
            <td>{formData.number3}</td>
            <td>{formData.number4}</td>
            <td>{formData.number5}</td> */}
              <td>{Üh}</td>
              <td>{Ük}</td>
              <td>{Umf}</td>
              <td>{vh}</td>
              <td>{vk}</td>
              <td>{sh}</td>
              <td>{sk}</td>
              <td>{Devh}</td>
              <td>{Devk}</td>
            </tr>
          </tbody>
        </table>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <p>
            Durch die Eingabe der Felder kannst du die{" "}
            <a className="underline">Entfaltung</a> in Meter pro Kurbeldrehung
            und die <a className="underline">Gescwindigkeit</a> berechnen.
            <br></br>
            <br></br>
            Die hohen Gänge liegen außen und die niedrigen Gänge innnen.
            <br></br>
            <a className="underline">Laufraddurchmesser</a> ist bei einem 28
            Zoll Rennrad 622 und 28mm breit.
          </p>
        </div>
      </div>
      {/* <FooterComponent></FooterComponent> */}
    </div>
  );
};

export default HomePage;
