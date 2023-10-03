import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function Wattrechner() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    let vd = event.target.vd.value;
    let s = event.target.s.value;
    let t = event.target.t.value;
    let vdr;
    let sr;
    let tr;

    // Variablen zum Rechnen

    //Rechnung
    vdr = parseInt(s) / parseInt(t);
    sr = parseInt(vd) * parseInt(t);
    tr = parseInt(s) / parseInt(vd);
    //vdr = Number.parseFloat(vdr).toFixed(2);
    //sr = Number.parseFloat(sr).toFixed(2);
    //tr = Number.parseFloat(tr).toFixed(2);

    // Ausgabe
    alert(
      `Die Durchschnittliche Geschwindigkeit ist ${vdr} km/h, die Strecke ist ${sr} km, die Zeit ist ${tr} Stunden`
    );
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      {/* <HeaderComponent></HeaderComponent> */}
      <div className="px-6 py-3">
        <div className="mb-2 text-xl font-bold">Geschwindigkeit, Distanz</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="vd">
            Durchschnittliche Geschwindigkeit (in km/h)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="vd"
            id="vd"
          />
          <label className="block mb-3" htmlFor="s">
            Distanz (in km)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="s"
            id="s"
          />
          <label className="block mb-3" htmlFor="t">
            Zeit (in h)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="t"
            id="t"
          />
          <button
            type="submit"
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
      </div>
      {/* <FooterComponent></FooterComponent> */}
    </div>
  );
}
