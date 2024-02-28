import Head from "next/head";
import StravaListSegments from "../components/strava/StravaListSegments";
import StravaSegmentKOM from "../components/strava/StravaSegmentKOM";
import { BatteryCharging } from "react-feather";
import Formlatlng from "../components/formlatlng";

export default function KOMhunter() {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>KOM Hunter</title>
        <meta
          name="description"
          content="KOM Hunter: Wo kann man welche KOMs holen"
          key="desc"
        />
        <meta property="og:title" content="Nützliche Tools für Radler" />
        <meta
          property="og:description"
          content="KOM Hunter: Wo kann man welche KOMs holen"
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
          KOM Hunter!!!
        </p>
        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Mit deinen dünnen Beinen kannst du hier angreifen..
        </p>
      </div>
      <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-2 text-gray-500 sm:gap-x-3 sm:gap-y-3">
        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <p>Wo guckst du?</p>
          <div className="mt-6">
            <p>
              Wir brauchen die Koordinaten von Südwest bis Nordost für die
              Suche.
            </p>
            <a
              href="https://www.latlong.net/"
              className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-1 py-1  rounded-lg"
            >
              latlong.net
            </a>
            <Formlatlng></Formlatlng>
          </div>
        </div>
        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <p>Was drückst du?</p>
          <div className="mt-6">
            <p>
              Für heute ist die Rechnung einfach: Du und dein Rad, ihr wiegt
              70kg.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-9 space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 text-gray-500 sm:gap-x-3 sm:gap-y-3">
        <div className="p-9 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          Dashboard
          <StravaListSegments />
        </div>
      </div>
      <StravaSegmentKOM />
    </div>
  );
}
