import { useState, useEffect } from "react";
import Head from "next/head";
import { List } from "react-feather";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

export default function ExampleCheckbox() {
  const [showWerkzeug, setshowWerkzeug] = useState();
  const [showNasskalt, setshowNasskalt] = useState();
  const [showElektronik, setshowElektronik] = useState();
  const [showErsatzteile, setshowErsatzteile] = useState();
  const [showAusruestung, setshowAusruestung] = useState();

  const [trockenNassData, setTrockenNassData] = useState();
  const [kurzLangData, setKurzLangData] = useState();
  const [wenigVielPlatzData, setWenigVielPlatzData] = useState();

  const [nassSelected, setNassSelected] = useState(false);
  const [langSelected, setLangSelected] = useState(false);
  const [vielPlatzSelected, setVielPlatzSelected] = useState(false);

  const apiUrl = "/api/Packliste";

  function pullJson() {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        const werkzeugData = responseData
          .filter((el) => el.category === "Werkzeug")
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setshowWerkzeug(werkzeugData);

        const nasskaltData = responseData
          .filter((el) => el.location !== "warm")
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setshowNasskalt(nasskaltData);

        const elektronikData = responseData
          .filter((el) => el.category === "Elektronik")
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setshowElektronik(elektronikData);

        const ersatzteileData = responseData
          .filter((el) => el.category === "Ersatzteile")
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setshowErsatzteile(ersatzteileData);

        const ausruestungData = responseData
          .filter(
            (el) => el.category === "Ausrüstung" && el.location === "warm"
          )
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setshowAusruestung(ausruestungData);

        // Additional filtering for the new switches
        const filteredTrockenNass = responseData
          .filter((el) =>
            nassSelected ? el.location !== "warm" : el.location === "warm"
          )
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setTrockenNassData(filteredTrockenNass);

        const filteredKurzLang = responseData
          .filter((el) =>
            langSelected ? el.duration === "lang" : el.duration === "kurz"
          )
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setKurzLangData(filteredKurzLang);

        const filteredWenigVielPlatz = responseData
          .filter((el) =>
            vielPlatzSelected ? el.size === "groß" : el.size === "klein"
          )
          .map((liste) => <p key={liste.id}>{liste.name}</p>);
        setWenigVielPlatzData(filteredWenigVielPlatz);
      });
  }

  useEffect(() => {
    pullJson();
  }, [nassSelected, langSelected, vielPlatzSelected]);

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Packliste</title>
        <meta
          name="description"
          content="Packlisten für Rennradfahrer"
          key="desc"
        />
        <meta property="og:title" content="Packliste" />
        <meta
          property="og:description"
          content="Packlisten für Rennradfahrer"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <List color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Packliste!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Na, was haben wir vergessen?
        </p>
      </div>

      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Ausrüstung</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-black text-left">
                {showAusruestung}
              </span>
            </li>
          </ul>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            Nass und kalt
          </h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-black text-left">{showNasskalt}</span>
            </li>
          </ul>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Werkzeug</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-left">{showWerkzeug}</span>
            </li>
          </ul>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Elektronik</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-black text-left">
                {showElektronik}
              </span>
            </li>
          </ul>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Ersatzteile</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-black text-left">
                {showErsatzteile}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* New Sections for the Switches */}
      {/* Switches for filtering */}
      <div className="mb-6 flex justify-center space-x-4">
        <FormControlLabel
          control={
            <Switch
              checked={nassSelected}
              onChange={(e) => setNassSelected(e.target.checked)}
              color="primary"
            />
          }
          label="Nass"
        />
        <FormControlLabel
          control={
            <Switch
              checked={langSelected}
              onChange={(e) => setLangSelected(e.target.checked)}
              color="primary"
            />
          }
          label="Lang"
        />
        <FormControlLabel
          control={
            <Switch
              checked={vielPlatzSelected}
              onChange={(e) => setVielPlatzSelected(e.target.checked)}
              color="primary"
            />
          }
          label="Viel Platz"
        />
      </div>
      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-3xl font-semibold text-gray-900">
              Trocken/Nass
            </h3>
            <ul role="list" className="mt-6 space-y-6">
              <li className="flex">
                <span className="ml-3 text-black text-left">
                  {trockenNassData}
                </span>
              </li>
            </ul>
          </div>
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-3xl font-semibold text-gray-900">Kurz/Lang</h3>
            <ul role="list" className="mt-6 space-y-6">
              <li className="flex">
                <span className="ml-3 text-black text-left">
                  {kurzLangData}
                </span>
              </li>
            </ul>
          </div>
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-3xl font-semibold text-gray-900">
              Wenig/Viel Platz
            </h3>
            <ul role="list" className="mt-6 space-y-6">
              <li className="flex">
                <span className="ml-3 text-black text-left">
                  {wenigVielPlatzData}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-8">
        <a
          href="mailto:customcyclingtracks@gmx.net"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Schreib uns
        </a>
      </div>
    </div>
  );
}
