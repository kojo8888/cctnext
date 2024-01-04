import Head from "next/head";

export default function Impressum({ products }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <Head>
        <title>Impressum</title>
        <meta name="description" content="Impressum" key="desc" />
        <meta property="og:title" content="Impressum" />
        <meta property="og:description" content="Impressum" />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="ml-5 mr-5 font-mono mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col text-left">
        <p className="mt-5 text-gray-500 text-left">
          Angaben gem&auml;&szlig; &sect; 5 TMG
        </p>

        <p>
          Konstantin Mair
          <br />
          Lachnerstra&szlig;e 30
          <br />
          80639 Munich
        </p>

        <p>Kontakt</p>
        <p>
          Telefon: +49 (0) 123 44 55 66
          <br />
          E-Mail: cumstomcyclingtracks@gmx.net
        </p>

        <p>Redaktionell verantwortlich</p>
        <p>Konstantin Mair</p>
      </div>
    </div>
  );
}
