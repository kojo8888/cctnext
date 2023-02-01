import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
export default function Speichenlaenge() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const D = event.target.D.value;
    const N = event.target.N.value;
    const A = event.target.A.value;
    const K = event.target.K.value;
    const Z = event.target.Z.value;

    // Variablen zum Rechnen
    const rRim = parseInt(D) / 2 - 1;
    const rHub = parseInt(N);
    const dFlange = parseInt(A);
    const cross = parseInt(K);
    const numS = parseInt(Z);

    // Ergebnis
    let lS;

    //Rechnung
    lS = Math.sqrt(
      rRim * rRim -
        rRim * rHub * Math.cos((cross * 12.566) / numS) +
        (rHub * rHub) / 4 +
        dFlange * dFlange
    );

    alert(`Deine Speichenlänge ist ${lS} mm!`);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-4">
        <div className="mb-2 text-xl font-bold">Speichenlänge</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlfor="D">
            D in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="D"
            id="D"
            required
          />
          <label className="block mb-3" htmlfor="N">
            N in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="N"
            id="N"
            required
          />
          <label className="block mb-3" htmlfor="A">
            A in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="A"
            id="A"
            required
          />
          <label className="block mb-3" htmlfor="K">
            K in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="K"
            id="K"
            required
          />
          <label className="block mb-3" htmlfor="Z">
            Z in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="Z"
            id="Z"
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
