import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Link from "next/link";
import { useRouter } from "next/router";
import { Clock, Archive, Tool, Map } from "react-feather";

export default function Home({ props }) {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <Head>
        <title>Home</title>
      </Head>
      <HeaderComponent></HeaderComponent>
      <p>
        <img src="Logo.png" className="rounded-lg w-32 mb-4 mx-auto" />
      </p>
      <p className="mt-12 text-3xl font-extrabold text-gray-900 tracking-tight">
        Die ultimative Rennradseite!
      </p>

      <p className="mt-12 text-xl font-extrabold text-gray-900 tracking-tight">
        Hier findest du alles rund ums Radfahren, kurz und knackig.
      </p>

      <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-2">
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Map color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            GPX Tracks
          </h3>
          <p className="mt-3 text-gray-500">
            Ob individuelle Tracks oder ein paar Standardrouten, hier wirst du
            fündig.
          </p>
        </div>

        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Archive color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Tips & Tricks
          </h3>
          <p className="mt-3 text-gray-500">
            Ein paar Blogposts zu Themen wie: Saisonstart auf Mallorca,
            Commuten, Kleiderwahl..
          </p>
        </div>
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Tool color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Tools
          </h3>
          <p className="mt-3 text-gray-500">
            Ritzelrechner, Ketten- und Speichenlänge, Packliste, Videos..
          </p>
        </div>
        <div className="bg-white border rounded-2xl px-6 pb-8">
          <p className="flex justify-center mt-6">
            <Clock color="black" />
          </p>
          <h3 className="mt-3 text-lg font-medium text-gray-900 tracking-tight">
            Kurz und knackig
          </h3>
          <p className="mt-3 text-gray-500">
            Alle Infos sind schnell und einfach zugänglich
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
