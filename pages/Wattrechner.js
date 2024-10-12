import Head from "next/head";
import { useState, useEffect } from "react";
import { BatteryCharging } from "react-feather";
import jsonData from "../lib/position_luftwiderstandswerte.json";

export default function Wattrechner() {
  const [selectedValue, setSelectedValue] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    // Extracting options based on Position "Oberlenker"
    const extractedOptions = jsonData.features.map((feature) => ({
      label: feature.Position,
      value: feature.Gesamt_gross_c_wA_Richtwert,
    }));

    setOptions(extractedOptions);
  }, []);

  const handleChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const submitForm = async (event) => {
    event.preventDefault();

    // Use the selectedValue for calculations or other logic
    // alert(`Selected value for Oberlenker is: ${selectedValue}`);

    //Variablen zum Abfragen
    const vk = event.target.vk.value; // Geschwindigkeit
    const mfahrer = event.target.mfahrer.value;
    const mrad = event.target.mrad.value;
    const d = event.target.d.value; // Distanz
    const h = event.target.h.value; // Höhe

    // fixe Variablen
    const p = 1.2;
    // const cwa = 0.3;
    const cwa = selectedValue;
    const cr = 0.0032; // Rollwiderstandskoeffizient
    let g = 9.18;

    // Variablen zum Rechnen
    let k; // Steigungsverhältnis Höhe (m) zu Länge (km)
    let v;
    let vclimb;
    let m;
    let Pclimb;
    let Proll;
    let Pair;
    let Ptotal;
    let Prel;

    //Rechnung
    k = parseInt(h) / (parseInt(d) * 1000);
    v = parseInt(vk) / 3.6;
    m = parseInt(mfahrer) + parseInt(mrad);

    Pair = Math.round((1 / 2) * cwa * p * Math.pow(v, 3));

    Proll = Math.round(m * g * cr * v);

    vclimb = (k * v) / Math.sqrt(1 + Math.pow(k, 2));
    Pclimb = Math.round(m * g * vclimb);

    // Ergebnis
    Ptotal = Math.round(Pair + Proll + Pclimb);
    Prel = Math.round(Ptotal / m);
    // TODO: Rundung zu grob

    // Ausgabe
    alert(
      `Die Leistung ist ${Ptotal}W, die relative Leistung ist ${Prel}W/kg, die Leistung für den Anstieg ist ${Pclimb}W, die Leistung gegen den Luftwiderstand ist ${Pair}W, die Leistung gegen den Rollwiderstand ist ${Proll}W`
    );
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Wattrechner</title>
        <meta
          name="description"
          content="Tool zum Berechnen der Leistung"
          key="desc"
        />
        <meta property="og:title" content="Wattrechner" />
        <meta
          property="og:description"
          content="Tool zum Berechnen der Leistung"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <BatteryCharging color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Wattrechner!!!
        </p>
        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Drücken, Junge!
        </p>
      </div>
      <div className="px-6 py-3">
        <form className="flex flex-col" onSubmit={submitForm}>
          <label className="block mb-3" htmlFor="vk">
            Geschwindigkeit (in km/h)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="vk"
            id="vk"
            required
          />
          <label className="block mb-3" htmlFor="mfahrer">
            Gewicht Fahrer (in kg)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="mfahrer"
            id="mfahrer"
            required
          />
          <label className="block mb-3" htmlFor="mrad">
            Gewicht Rad (in kg)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="mrad"
            id="mrad"
            required
          />
          <label className="block mb-3" htmlFor="d">
            Distanz (in km)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="d"
            id="d"
            required
          />
          <label className="block mb-3" htmlFor="h">
            Höhenunterschied (in m)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="h"
            id="h"
            required
          />
          <label className="block mb-3" htmlFor="positionSelect">
            Sitzposition (Fahrer groß)
          </label>
          <select
            id="positionSelect"
            value={selectedValue}
            onChange={handleChange}
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            required
          >
            <option value="" disabled>
              Auswählen..
            </option>
            {options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label} - {option.value}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
      </div>
    </div>
  );
}
