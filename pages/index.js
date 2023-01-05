import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Link from "next/link";
import { useRouter } from "next/router";
import { Clock, Heart, MapPin, Users } from "react-feather";

export default function Home({ props }) {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <HeaderComponent></HeaderComponent>

      <p>
        <img src="Logo.png" className="rounded-lg w-32 mb-4 mx-auto" />
      </p>
      <p className="mt-12 text-3xl font-extrabold text-gray-900 tracking-tight">
        Keine Lust auf stundenlange Routenplanung?
      </p>

      <p className="mt-12 text-xl font-extrabold text-gray-900 tracking-tight">
        Wir erstellen deine individuelle Fahrradtour, schnell und ohne Stress
      </p>

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
      <div className="p-9">
        <a
          href="mailto:customcyclingtracks@gmx.net"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Schreib uns
        </a>
      </div>
      <div className="mb-10 p-3">
        <a
          href="https://forms.aweber.com/form/40/1727432440.htm"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Frequent updates
        </a>
      </div>

      <FooterComponent></FooterComponent>
    </div>
  );
}
