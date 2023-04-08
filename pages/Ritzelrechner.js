import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function Ritzelrechner() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const ZR = event.target.ZR.value;
    const ZK = event.target.ZK.value;
    const wd = event.target.wd.value;
    const wb = event.target.wb.value;
    const Cad = event.target.Cad.value;
    var Bb;

    let v;
    let Ü;
    let Dev;
    var s;
    var Umf;

    //Übersetzung
    Ü = parseInt(ZR) / parseInt(ZK);
    //Umfang in m
    Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
    Umf = Number.parseFloat(Umf).toFixed(2);
    //Entfaltung
    Dev = Umf / Ü;
    Dev = Number.parseFloat(Dev).toFixed(2);
    //Entfaltung bei Cad in m
    s = parseInt(Cad) * Umf * Ü;
    //Geschwindigkeit in km/h
    v = (Dev * parseInt(Cad) * 60) / 1000;
    v = Number.parseFloat(v).toFixed(2);
    //Bandbreite
    //Gk = ZRk / ZKk;
    //Gh = ZKh / ZRh;
    //Bb = Gh / Gk;

    // Ausgabe
    alert(
      `Die Entfaltung ist ${Umf}m/Kurbelumdrehung, die Geschwindigkeit ist ${v}km/h`
    );
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">
          Ritzelrechner und Schaltverhältnis
        </div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlfor="ZK">
            Zähnezahl Kettenblatt
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZK"
            id="ZK"
            required
          />
          <label className="block mb-3" htmlfor="ZR">
            Zähnezahl Ritzel
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZR"
            id="ZR"
            required
          />
          <label className="block mb-3" htmlfor="wd">
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
          <label className="block mb-3" htmlfor="wb">
            Reifenbreite (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wb"
            placeholder="Rennrad ~ 30mm"
            id="wb"
            required
          />
          <label className="block mb-3" htmlfor="Cad">
            Kadenz (in 1/min)
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
        <div className="mt-3 space-y-3 sm:space-y-0 sm:grid sm:gap-x-3 sm:gap-y-3">
          <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
            <p>
              Hier findest du ein paar{" "}
              <a class="underline">Laufraddurchmesser:</a>
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
      <FooterComponent></FooterComponent>
    </div>
  );
}
