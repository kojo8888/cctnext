import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
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
    let U;
    let v;
    let Ü;
    let Dev;

    //Rechnung
    Ü = parseInt(ZK) / parseInt(ZR);
    v = (parseInt(veloc) * 1000) / 60;
    U = (parseInt(wd) * Math.PI) / 1000;

    // Ergebnis
    Cad = (Ü * v) / U;
    Dev = U / Ü;

    alert(`Deine Trittfrequenz ist ${Cad}1/min, die Entfaltung ist ${Dev}m!`);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-4">
        <div className="mb-2 text-xl font-bold">
          Trittfrequenz und Entfaltung
        </div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlfor="ZR">
            ZR in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZR"
            id="ZR"
            required
          />
          <label className="block mb-3" htmlfor="ZK">
            ZK in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZK"
            id="ZK"
            required
          />
          <label className="block mb-3" htmlfor="wd">
            wd in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wd"
            id="wd"
            required
          />
          <label className="block mb-3" htmlfor="veloc">
            veloc in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="veloc"
            id="veloc"
            required
          />

          <button
            type="submit"
            className="px-4 py-2 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
      </div>
      <FooterComponent></FooterComponent>
    </div>
  );
}
