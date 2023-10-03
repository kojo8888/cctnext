import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
export default function Wattrechner() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const vk = event.target.vk.value;
    const mfahrer = event.target.mfahrer.value;
    const mrad = event.target.mrad.value;
    const d = event.target.d.value;
    const h = event.target.h.value;

    // fixe Variablen
    const p = 1.2;
    const cwa = 0.3;
    const y = 0.005;
    let g = 9.18;
    //let k = 0.001;

    // Variablen zum Rechnen
    let k;
    let v;
    let vclimb;
    let m;
    let Pclimb;
    let Proll;
    let Pair;
    let Ptotal;
    let Prel;

    //Rechnung
    k = parseInt(h) / (parseInt(d) * 1000);
    v = parseInt(vk) / 3.6;
    m = parseInt(mfahrer) + parseInt(mrad);
    Pair = Math.round((1 / 2) * cwa * p * Math.pow(v, 3));
    Proll = Math.round(m * g * y * v);

    vclimb = (k * v) / Math.sqrt(1 + Math.pow(k, 2));
    Pclimb = Math.round(m * g * vclimb);

    // Ergebnis
    Ptotal = Math.round(Pair + Proll + Pclimb);
    Prel = Math.round(Ptotal / m);

    // Ausgabe
    alert(
      `Die Leistung ist ${Ptotal}, die relative Leistung ist ${Prel}, die Leistung für den Anstieg ist ${Pclimb}, die Leistung gegen den Luftwiderstand ist ${Pair}, die Leistung gegen den Rollwiderstand ist ${Proll}`
    );
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      {/* <HeaderComponent></HeaderComponent> */}
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">Wattrechner</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="vk">
            Geschwindigkeit (in km/h)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="vk"
            id="vk"
            required
          />
          <label className="block mb-3" htmlFor="mfahrer">
            Gewicht Fahrer (in kg)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="mfahrer"
            id="mfahrer"
            required
          />
          <label className="block mb-3" htmlFor="mrad">
            Gewicht Rad (in kg)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="mrad"
            id="mrad"
            required
          />
          <label className="block mb-3" htmlFor="d">
            Distanz (in km)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="d"
            id="d"
            required
          />
          <label className="block mb-3" htmlFor="h">
            Höhenunterschied (in m)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="h"
            id="h"
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
      {/* <FooterComponent></FooterComponent> */}
    </div>
  );
}
