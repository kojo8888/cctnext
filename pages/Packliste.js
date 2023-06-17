import { useState, useEffect } from "react";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import { Plus } from "react-feather";
import Head from "next/head";

export default function ExampleCheckbox() {
  const [showBasis, setshowBasis] = useState();
  const [showNass, setshowNass] = useState();
  const [showWplatz, setshowWplatz] = useState();
  const [showVplatz, setshowVplatz] = useState();
  const apiUrl = "/api/liste";
  let displayData;
  let dData;

  function pullJson() {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        displayData = responseData
          .filter((el) => el.category == "Werkzeug")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowBasis(displayData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        dData = rData
          .filter((els) => els.category == "Elektronik")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowNass(dData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        dData = rData
          .filter((els) => els.category == "Elektronik")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowVplatz(dData);
      });
    fetch(apiUrl)
      .then((response) => response.json())
      .then((rData) => {
        dData = rData
          .filter((els) => els.category == "Elektronik")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setshowWplatz(dData);
      });
  }

  useEffect(() => {
    pullJson();
  }, []);

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Packliste</title>
      </Head>
      <HeaderComponent></HeaderComponent>

      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Basis</h3>
          <p className="mt-4 mx-auto"></p>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-left">{showBasis}</span>
            </li>
          </ul>
        </div>
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            Nass und kalt
          </h3>
          <p className="mt-4 mx-auto"></p>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">{showNass}</span>
            </li>
          </ul>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Wenig Platz</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">{showWplatz}</span>
            </li>
          </ul>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Viel Platz</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-black text-left">{showVplatz}</span>
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

      <FooterComponent></FooterComponent>
    </div>
  );
}
