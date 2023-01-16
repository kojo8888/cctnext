import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import { Plus } from "react-feather";

export default function tools({ products }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <HeaderComponent></HeaderComponent>

      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Kettenlänge</h3>
          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€0</span>
            <span className="ml-1 text-xl font-semibold">/GPX</span>
          </p>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            Gangverhältnis
          </h3>
          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€29</span>
            <span className="ml-1 text-xl font-semibold">/GPX</span>
          </p>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            Kalorienrechner
          </h3>

          <p className="mt-4 mx-auto">
            <span className="text-5xl font-extrabold tracking-tight">€249</span>
            <span className="ml-1 text-xl font-semibold">/multi-stage GPX</span>
          </p>
        </div>

        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Kettenlänge</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-gray-500 text-left">
                <a
                  href="Kettenl"
                  className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
                >
                  Kettenlänge
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
