import Head from "next/head";
import { Tool, Map, Maximize2, BatteryCharging, List } from "react-feather";

export default function tools({ products }) {
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
          content="Fahrradtouren, GPX Strecken und Packlisten für Rennradfahrer"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Tool color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Tools für Nerds!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Hier findest du alles: Ritzelrechner, Karte mit Trinkwasserbrunnen und
          Packlisten.
        </p>
      </div>
      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <div className="pb-12">
            <p className="flex justify-center">
              <Maximize2 color="black" />
            </p>
            <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
              Geometrie
            </h3>
            <p className="mt-3 text-gray-500">Was muss wie lang?</p>
          </div>
          <span className="text-gray-500">
            <a
              href="Kettenlaenge"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Kettenlänge
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Speichenlaenge"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Speichenlänge
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Ritzelrechner"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Ritzelrechner
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Kurbellaenge"
              className="font-medium text-white hover:bg-blue-600 bg-red-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Kurbellänge
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Reifendruck"
              className="font-medium text-white hover:bg-blue-600 bg-red-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Reifendruck
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Reifengroeße"
              className="font-medium text-white hover:bg-blue-600 bg-red-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Reifengröße
            </a>
          </span>
        </div>

        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <div className="pb-12">
            <p className="flex justify-center">
              <BatteryCharging color="black" />
            </p>
            <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
              Performance
            </h3>
            <p className="mt-3 text-gray-500">1000 Watt!</p>
          </div>
          <span className="text-gray-500">
            <a
              href="GPX_Faelschung"
              className="font-medium text-white hover:bg-blue-600 bg-red-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Fälschungswerkstatt
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="KOMhunter"
              className="font-medium text-white hover:bg-blue-600 bg-red-500 px-3 py-2 -mt-2 rounded-lg"
            >
              KOM Hunter
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Wattrechner"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Wattrechner
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Geschwindigkeit"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Geschwindigkeit
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Trittfrequenz"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Trittfrequenz
            </a>
          </span>
        </div>

        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <div className="pb-12">
            <p className="flex justify-center">
              <Map color="black" />
            </p>
            <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
              Geographie
            </h3>
            <p className="mt-3 text-gray-500">GPS Themen</p>
          </div>
          <span className="text-gray-500">
            <a
              href="mapTrinkwasserspender"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Fahrradkarte
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="maps"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Standard-Touren
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="custom"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Individuelle Touren
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="mapOSM"
              className="font-medium text-white hover:bg-blue-600 bg-red-500 px-3 py-2 -mt-2 rounded-lg"
            >
              OSM
            </a>
          </span>
        </div>

        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <div className="pb-12">
            <p className="flex justify-center">
              <List color="black" />
            </p>
            <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
              Listen
            </h3>
            <p className="mt-3 text-gray-500">Guckst du nach!</p>
          </div>
          <span className="text-gray-500">
            <a
              href="Bikeflix"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Bikeflix
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Packliste"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Packliste
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Addonliste"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Strava Add-ons
            </a>
          </span>
        </div>
      </div>

      <div className="p-8">
        <a
          href="https://forms.aweber.com/form/40/1727432440.htm"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-3 mt-6 rounded-lg"
        >
          Email News!
        </a>
      </div>
    </div>
  );
}
