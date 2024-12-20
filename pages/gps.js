import { Clock, Heart, MapPin, Users, Map } from "react-feather";
import Head from "next/head";

export default function gpsind({ products }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <Head>
        <title>GPX Strecken</title>
        <meta
          name="description"
          content="Fahrradtouren für Rennradfahrer"
          key="desc"
        />
        <meta property="og:title" content="GPX Strecken" />
        <meta
          property="og:description"
          content="Fahrradtouren für Rennradfahrer"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="font-mono mt-3 mx-auto text-center max-w-3xl px-10"></div>
      <p className="flex justify-center mt-6">
        <Map color="black" />
      </p>
      <p className="mt-12 text-3xl font-extrabold text-gray-900 tracking-tight">
        Keine Lust auf stundenlange Routenplanung?
      </p>

      <p className="mt-12 text-xl font-extrabold text-gray-900 tracking-tight">
        Wir erstellen deine individuelle Fahrradtour, schnell und ohne Stress
      </p>
      <div className="p-3">
        <a
          href="custom"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Interessiert an einem individuellem Track?
        </a>
      </div>
      <div className="p-3">
        <a
          href="maps"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Hier geht es zu den Standards!
        </a>
      </div>
      <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-2">
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <MapPin color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Angepasst an deine Wünsche
          </h3>
          <p className="mt-3 text-gray-500">
            Von Start bis zum Ziel erstellen wir dir deinen individuellen GPX
            Track
          </p>
        </div>

        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Heart color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Nervenschonend
          </h3>
          <p className="mt-3 text-gray-500">
            Verschwende keine kostbare Zeit, gib uns ein paar Details, wir
            machen den Rest
          </p>
        </div>
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Users color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Von erfahrenen Radlern
          </h3>
          <p className="mt-3 text-gray-500">
            Wir kennen uns aus - mit allen Fahrradtypen.
          </p>
        </div>
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Clock color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Schnelle Lieferung
          </h3>
          <p className="mt-3 text-gray-500">
            Deinen GPX Track bekommst du innerhalb von 12 Stunden.
          </p>
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
