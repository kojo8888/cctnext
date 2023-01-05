import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import { Plus } from "react-feather";

export default function gpsind({ products }) {
  return (
    // <Layout title="Genervt von Komoot?">

    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <HeaderComponent></HeaderComponent>

      <div className="p-8">
        <a
          href="custom"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          How to get your customized track?
        </a>
      </div>

      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            The essentials
          </h3>
          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€0</span>
            <span className="ml-1 text-xl font-semibold">/GPX</span>
          </p>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="https://customcyclingtracks.gumroad.com/l/qztdlr"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  München, Deutschland
                </a>
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="https://customcyclingtracks.gumroad.com/l/bxstou"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  Bozen, Tirol
                </a>
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="https://customcyclingtracks.gumroad.com/l/bvitl"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  Mallorca, Spanien
                </a>
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">Packliste</span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                Wissenswertes übers Rennradfahren
              </span>
            </li>
          </ul>
        </div>
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            The Customized Track
          </h3>
          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€29</span>
            <span className="ml-1 text-xl font-semibold">/GPX</span>
          </p>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                Entfernung und Höhenmeter
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                Cafepausen und andere Stopps
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                12 Stunden oder schneller bis zur individuellen Tour
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="https://customcyclingtracks.gumroad.com/l/sgspp"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  Customized Track
                </a>
              </span>
            </li>
          </ul>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            The Traveller
          </h3>

          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€249</span>
            <span className="ml-1 text-xl font-semibold">/multi-stage GPX</span>
          </p>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                Bis zu 10 GPX Tracks aufeinander abgestimmt
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                Entfernung und Höhenmeter
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                Cafepausen und andere Stopps
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                36 Stunden bis zur individuellen Bikepackingtour
              </span>
            </li>
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="https://customcyclingtracks.gumroad.com/l/ifagj"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  Bikepacking
                </a>
              </span>
            </li>
          </ul>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">The Expert</h3>
          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€60</span>
            <span className="ml-1 text-xl font-semibold">/session</span>
          </p>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="text-blue-500 text-3xl">
                <Plus />
              </span>
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="https://customcyclingtracks.gumroad.com/l/szldn"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  Skype or Zoom
                </a>
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
          Contact us
        </a>
      </div>

      <FooterComponent></FooterComponent>
    </div>
  );
}
