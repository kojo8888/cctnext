import Head from "next/head";
import { useRouter } from "next/router";
import { Clock, Archive, Tool, Map } from "react-feather";

export default function Home({ props }) {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <Head>
        <title>Custom Cycling Tracks</title>
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
            <a
              href="./gps"
              className="font-medium hover:underline mt-3 text-lg text-gray-900 tracking-tight"
            >
              GPX Tracks
            </a>
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
            <a
              href="./tips"
              className="font-medium hover:underline mt-3 text-lg text-gray-900 tracking-tight"
            >
              Tips & Tricks
            </a>
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
            <a
              href="./tools"
              className="font-medium hover:underline mt-3 text-lg text-gray-900 tracking-tight"
            >
              Tools
            </a>
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
      <div className="mb-3 p-12">
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
