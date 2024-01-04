import Head from "next/head";
import { useRouter } from "next/router";
import { CreditCard, Database, Download, Clipboard } from "react-feather";

export default function custom({ products }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <Head>
        <title>Individueller GPS Track</title>
        <meta
          name="description"
          content="Fahrradtouren maßgeschneidert, von Haustür zu Haustür als GPX Strecke"
          key="desc"
        />
        <meta property="og:title" content="Individuelle Fahrradtouren" />
        <meta
          property="og:description"
          content="Fahrradtouren maßgeschneidert, von Haustür zu Haustür als GPX Strecke"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>{" "}
      <div className="font-mono mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col text-left">
        <p className="flex">
          <Clipboard />
        </p>
        <p className="mt-3 mb-3 text-black uppercase small underline">
          Sende uns deine Anfrage per Mail
        </p>
        <ul className="list-disc list-inside">
          <li className="mb-3 text-black text-sm">
            Fahrradtyp und bevorzugter Untergrund
          </li>
          <li className="mb-3 text-black text-sm">
            Start- und Endpunkt, Zwischenstopps
          </li>
          <li className="mb-3 text-black text-sm">
            Distanz und gewünschte Höhenmeter. Diese beiden Parameter versuchen
            wir bestmöglich zu kombinieren
          </li>
          <li className="mb-3 text-black text-sm">
            Sonderwünsche wie z. B. Cafe-Stop, Supermarkt/Bäcker, etc.
          </li>
        </ul>
      </div>
      <div className="mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col text-left">
        <p className="flex">
          <Database />
        </p>
        <p className="mt-3 mb-3 text-black uppercase small underline">
          Wir bauen deinen individuellen GPX Track
        </p>
        <ul className="list-disc list-inside">
          <li className="mb-3 text-black text-sm">
            Wir kombinieren verschiedene Apps wie z. B. Strava Heat Map, Komoot,
            Radtourenwege und unsere eigenen Erfahrugen.
          </li>
          <li className="mb-3 text-black text-sm">
            Anschließend optimieren wir dir aus deinen Details eine auf dich
            angepasste Tour.
          </li>
        </ul>
      </div>
      <div className="mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col text-left">
        <p className="flex">
          <CreditCard />
        </p>
        <p className="mt-3 mb-3 text-black uppercase small underline">
          Bezahle sichere per Stripe
        </p>
        <ul className="list-disc list-inside">
          <li className="mb-3 text-black text-sm">
            Die Bezahlung erfolgt über Stripe. Dazu schicken wir dir einen Link
            zu.
          </li>
          <li className="mb-3 text-black text-sm">
            Solltest du ein Mal nicht zufrieden sein, erstatten wir dir 50%
            zurück.
          </li>
        </ul>
      </div>
      <div className="mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col text-left">
        <p className="flex">
          <Download />
        </p>
        <p className="mt-3 mb-3 text-black uppercase small underline">
          Erhalte deinen individuellen GPX Track
        </p>
        <ul className="list-disc list-inside">
          <li className="mb-3 text-black text-sm">
            Nach der Zahlung bekommst du deinen GPX Track innerhalb von 12
            Stunden per Email zugesandt.
          </li>
          <li className="mb-3 text-black text-sm">
            Solltest du beim Setup auf deinem Garmin-Gerät Hilfe benötige,
            stehen wir dir gerne zur Seite.
          </li>
        </ul>
      </div>
      <div className="p-25 p-8">
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
