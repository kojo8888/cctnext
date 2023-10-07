import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";

export default function Trittfrequenz() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const ZR = event.target.ZR.value;
    const ZK = event.target.ZK.value;
    const wd = event.target.wd.value;
    const veloc = event.target.veloc.value;

    // Variablen zum Rechnen
    let Cad;
    let Umf;
    let v;
    let Ü;
    let Dev;

    //Rechnung
    Ü = parseInt(ZR) / parseInt(ZK);
    v = (parseInt(veloc) * 1000) / 60;
    Umf = (parseInt(wd) * Math.PI) / 1000;

    // Ergebnis
    Cad = (Ü * v) / Umf;
    Dev = Umf / Ü;
    Cad = Number.parseFloat(Cad).toFixed(2);
    Dev = Number.parseFloat(Dev).toFixed(2);

    // Ausgabe
    alert(`Deine Trittfrequenz ist ${Cad}1/min, die Entfaltung ist ${Dev}m!`);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Trittfrequenz und Entfaltung</title>
        <meta
          name="description"
          content="Tool zum Berechnen der Trittfrequenz"
          key="desc"
        />
        <meta property="og:title" content="Trittfrequenz und Entfaltung" />
        <meta
          property="og:description"
          content="Tool zum Berechnen der Trittfrequenz"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      {/* <HeaderComponent></HeaderComponent> */}
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">
          Trittfrequenz und Entfaltung
        </div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="ZK">
            Zähnezahl Kettenblatt
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZK"
            id="ZK"
            required
          />
          <label className="block mb-3" htmlFor="ZR">
            Zähnezahl Ritzel
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZR"
            id="ZR"
            required
          />
          <label className="block mb-3" htmlFor="wd">
            Laufraddurchmesser (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wd"
            placeholder="Rennrad ~ 694mm"
            id="wd"
            required
          />
          <label className="block mb-3" htmlFor="veloc">
            Geschwindigkeit (in km/h)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="veloc"
            id="veloc"
            required
          />
          <button
            type="submit"
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
        <div className="mt-3 space-y-3 sm:space-y-0 sm:grid sm:gap-x-3 sm:gap-y-3">
          <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
            <p>
              Durch die Eingabe der Felder kannst du die Trittfrequenz und die
              Entfaltung berechnen.<br></br>
              <br></br>
              Die berechnete <a class="underline">Trittfrequenz</a> zeigt dir,
              wie schnell du im jeweiligen Gang bei der angegebenen
              Geschwindigkeit treten musst.<br></br>
              Die <a class="underline">Entfaltung</a> ist die zurückgelegte
              Strecke bei einer Kurbelumdrehung.<br></br>
              <br></br>Hier findest du ein paar{" "}
              <a className="underline">Laufraddurchmesser:</a>
              <br></br>37-349 420 mm<br></br>
              32-369 430 mm<br></br>
              28-406 469 mm<br></br>
              37-406 483 mm<br></br>
              47-406 498 mm<br></br>
              25-559 617 mm<br></br>
              33-559 630 mm<br></br>
              47-559 645 mm<br></br>
              51-559 664 mm<br></br>
              37-622 694 mm<br></br>
              47-622 709 mm
            </p>
          </div>
        </div>
      </div>
      {/* <FooterComponent></FooterComponent> */}
    </div>
  );
}
