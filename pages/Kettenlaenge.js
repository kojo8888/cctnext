import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function Kettenlaenge() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const lKettenstrebe = event.target.lKettenstrebe.value;
    const ZKettenblatt = event.target.ZKettenblatt.value;
    const ZRitzel = event.target.ZRitzel.value;
    const Schaltungsroellchen = event.target.Schaltungsroellchen.value;

    // Variablen zum Rechnen
    let Klungerundet;
    let Klgerundet;
    let Klgerade;

    // Ergebnis
    let Kl;

    //Rechnung
    if (parseInt(Schaltungsroellchen) === 10) {
      Klungerundet =
        0.157 * parseInt(lKettenstrebe) +
        (1 / 2) * parseInt(ZKettenblatt) +
        (1 / 2) * parseInt(ZRitzel) +
        2;
      Klgerundet = Math.ceil(Klungerundet);
      if (Klgerundet % 2 != 0) {
        Klgerade = Klgerundet + 1;
      } else Klgerade = Klgerundet;
    } else if (parseInt(Schaltungsroellchen) === 11) {
      Klungerundet =
        0.157 * parseInt(lKettenstrebe) +
        (1 / 2) * parseInt(ZKettenblatt) +
        (1 / 2) * parseInt(ZRitzel) +
        2 +
        2;
      Klgerundet = Math.ceil(Klungerundet);
      if (Klgerundet % 2 != 0) {
        Klgerade = Klgerundet + 1;
      } else Klgerade = Klgerundet;
    } else if (parseInt(Schaltungsroellchen) === 12) {
      Klungerundet =
        0.157 * parseInt(lKettenstrebe) +
        (1 / 2) * parseInt(ZKettenblatt) +
        (1 / 2) * parseInt(ZRitzel) +
        2 +
        4;

      Klgerundet = Math.ceil(Klungerundet);
      if (Klgerundet % 2 != 0) {
        Klgerade = Klgerundet + 1;
      } else Klgerade = Klgerundet;
    }
    Kl = Klgerade;

    // Ausgabe
    alert(`Deine Kettenlänge ist ${Kl} Glieder!`);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">Kettenlänge</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlfor="lKettenstrebe">
            Kettenstrebenlänge (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="lKettenstrebe"
            id="lKettenstrebe"
            placeholder="gewöhnlich ~ 420mm"
            required
          />
          <label className="block mb-3" htmlfor="ZKettenblatt">
            Zähnezahl größtes Kettenblatt (vorne)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZKettenblatt"
            id="ZKettenblatt"
            placeholder="~ 44"
            required
          />
          <label className="block mb-3" htmlfor="ZRitzel">
            Zähnezahl größtes Ritzel (hinten)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZRitzel"
            id="ZRitzel"
            placeholder="~ 28"
            required
          />
          <label className="block mb-3" htmlfor="Schaltungsröllchen">
            Schaltungsröllchen
          </label>
          <select
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            id="Schaltungsroellchen"
            name="Schaltungsroellchen"
            required
          >
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
          </select>
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
              <br></br>
              In diesem Tool kannst du die theoretische Kettenlänge deines
              Fahrrades berechnen. Bei Nabenschaltungen funktioniert es nicht.
              <br></br> <br></br>
              Die <a class="underline">Kettenstrebenlänge</a> ist der Abstand
              zwischen dem Tretlager und der Hinterradachse.<br></br>Das
              <a class="underline">Schaltungsröllchen</a> ist am hinteren
              Schaltwerk das kleine Ritzel zur Führung der Kette.
            </p>
            <p>
              <img src="Kettenlaenge.png" className="rounded-lg mx-auto mt-6" />
            </p>
          </div>
        </div>
      </div>
      <FooterComponent></FooterComponent>
    </div>
  );
}
