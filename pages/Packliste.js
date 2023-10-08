import { useState, useEffect } from "react";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import { Plus } from "react-feather";
import Head from "next/head";

export default function ExampleCheckbox() {
  const [showWerkzeug, setshowWerkzeug] = useState();
  const [showNasskalt, setshowNasskalt] = useState();
  const [showElektronik, setshowElektronik] = useState();
  const [showErsatzteile, setshowErsatzteile] = useState();
  const [showAusruestung, setshowAusruestung] = useState();

  // const [showVplatz, setshowVplatz] = useState();
  const apiUrl = "/api/Packliste";
  let werkzeugData;
  let elektronikData;
  let nasskaltData;
  let ersatzteileData;
  let ausruestungData;

  function pullJson() {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        werkzeugData = responseData
          .filter((el) => el.category == "Werkzeug")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowWerkzeug(werkzeugData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        nasskaltData = rData
          .filter((els) => els.location != "warm")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowNasskalt(nasskaltData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        elektronikData = rData
          .filter((els) => els.category == "Elektronik")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowElektronik(elektronikData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        ersatzteileData = rData
          .filter((els) => els.category == "Ersatzteile")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowErsatzteile(ersatzteileData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        ausruestungData = rData
          .filter(
            (els) => els.category == "Ausrüstung" && els.location == "warm"
          )
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowAusruestung(ausruestungData);
      });
  }

  useEffect(() => {
    pullJson();
  }, []);

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
      {/* <HeaderComponent></HeaderComponent> */}

      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Ausrüstung</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">
                {showAusruestung}
              </span>
            </li>
          </ul>
        </div>
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            Nass und kalt
          </h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">{showNasskalt}</span>
            </li>
          </ul>
        </div>
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Werkzeug</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-left">{showWerkzeug}</span>
            </li>
          </ul>
        </div>
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Elektronik</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">
                {showElektronik}
              </span>
            </li>
          </ul>
        </div>
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Ersatzteile</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">
                {showErsatzteile}
              </span>
            </li>
          </ul>
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

      {/* <FooterComponent></FooterComponent> */}
    </div>
  );
}
