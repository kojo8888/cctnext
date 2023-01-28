export default function Kettenl() {
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
    alert(`Deine Kettenlänge ist ${Kl}?`);
  };

  return (
    <div className="max-w-xs my-2 overflow-hidden rounded shadow-lg">
      <div className="px-6 py-4">
        <div className="mb-2 text-xl font-bold">Kettenlänge</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlfor="lKettenstrebe">
            Kettenstrebenlänge in mm
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="lKettenstrebe"
            id="lKettenstrebe"
            placeholder="gewöhnlich ~420mm"
            required
          />
          <label className="block mb-3" htmlfor="ZKettenblatt">
            Zähnezahl größtes Kettenblatt (vorne)
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZKettenblatt"
            id="ZKettenblatt"
            placeholder="~44"
            required
          />
          <label className="block mb-3" htmlfor="ZRitzel">
            Zähnezahl größtes Ritzel (hinten)
          </label>
          <input
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZRitzel"
            id="ZRitzel"
            placeholder="~28"
            required
          />
          <label className="block mb-3" htmlfor="Schaltungsröllchen">
            Schaltungsröllchen
          </label>
          <select
            className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
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
            className="px-4 py-2 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
      </div>
    </div>
  );
}
