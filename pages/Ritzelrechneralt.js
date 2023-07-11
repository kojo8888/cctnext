import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";

export default function Ritzelrechner() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const ZRh = event.target.ZRh.value;
    const ZRk = event.target.ZRk.value;
    const ZKh = event.target.ZKh.value;
    const ZKk = event.target.ZKk.value;
    //const U = event.target.U.value;
    const wd = event.target.wd.value;
    const wb = event.target.wb.value;
    const Cad = event.target.Cad.value;

    //Gesucht
    //Bandbreite
    var Bb;
    //Geschwindigkeit
    let vh;
    let vk;
    //Übersetzung
    let Ü;
    //Entfaltung,Development
    let Dev;
    var s;
    //Umfang
    var Umf;

    //
    var Gk;
    var Gh;
    var Devh;
    var Devk;
    var Üh;
    var Ük;

    //Übersetzung h
    Üh = parseInt(ZRh) / parseInt(ZKh);
    Ük = parseInt(ZRk) / parseInt(ZKk);
    //Umfang in m
    Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
    Umf = Number.parseFloat(Umf).toFixed(2);
    //Entfaltung
    Devh = Umf / Üh;
    Devh = Number.parseFloat(Devh).toFixed(2);
    Devk = Umf / Ük;
    Devk = Number.parseFloat(Devk).toFixed(2);
    //Entfaltung bei Cad in m
    s = parseInt(Cad) * Umf * Ü;
    //Geschwindigkeit in km/h
    vh = (Devh * parseInt(Cad) * 60) / 1000;
    vh = Number.parseFloat(vh).toFixed(2);
    vk = (Devk * parseInt(Cad) * 60) / 1000;
    vk = Number.parseFloat(vk).toFixed(2);
    //Bandbreite
    Gk = ZRk / ZKk;
    Gh = ZKh / ZRh;
    Bb = Gk / Gh;

    // Ausgabe
    alert(
      `Die Bandbreite ist ${Bb}, die Geschwindigkeit ist ${vh}km/h ${vk}km/h, die Entfaltung ist min ${Devk} max ${Devh}`
    );
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Ritzelrechner</title>
      </Head>
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">Ritzelrechner</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="ZKh">
            Zähnezahl Kettenblatt hoch
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZKh"
            id="ZKh"
            required
          />
          <label className="block mb-3" htmlFor="ZKk">
            Zähnezahl Kettenblatt klein
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZKk"
            id="ZKk"
            required
          />
          <label className="block mb-3" htmlFor="ZRh">
            Zähnezahl Ritzel hoch
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZRh"
            id="ZRh"
            required
          />
          <label className="block mb-3" htmlFor="ZRk">
            Zähnezahl Ritzel klein
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZRk"
            id="ZRk"
            required
          />
          <label className="block mb-3" htmlFor="wd">
            Laufraddurchmesser (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wd"
            placeholder="Rennrad ~ 622mm"
            id="wd"
            required
          />
          <label className="block mb-3" htmlFor="wb">
            Breite (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wb"
            placeholder="Rennrad ~ 23mm"
            id="wb"
            required
          />
          <label className="block mb-3" htmlFor="Cad">
            Trittfrequenz (in 1/U)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="Cad"
            id="Cad"
            required
          />
          <button
            type="submit"
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
      </div>

      <FooterComponent></FooterComponent>
    </div>
  );
}
