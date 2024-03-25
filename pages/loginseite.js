import Head from "next/head";
import { useRouter } from "next/router";
import { Clock, Archive, Tool, Map } from "react-feather";

export default function Home({ props }) {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <a href="/api/auth/signin">login</a>
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
