import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";

export default function tools({ products }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Tools</title>
      </Head>
      <HeaderComponent></HeaderComponent>
      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
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
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <span className="text-gray-500">
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

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <span className="text-gray-500">
            <a
              href="Reifendruck"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Reifendruck
            </a>
          </span>
          <span className="mt-9 text-gray-500">
            <a
              href="Reifengroeße"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Reifengröße
            </a>
          </span>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <span className="text-gray-500">
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
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
            >
              Kurbellänge
            </a>
          </span>
          <span className="mt-9 text-gray-500">
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
        </div>
      </div>

      <div className="p-8">
        <a
          href="mailto:customcyclingtracks@gmx.net"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Contact us
        </a>
      </div>

      <FooterComponent></FooterComponent>
    </div>
  );
}
