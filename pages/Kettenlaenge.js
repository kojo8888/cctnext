import Head from "next/head";
import { Link } from "react-feather";

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
      <Head>
        <title>Kettenlänge</title>
        <meta
          name="description"
          content="Tool zum Berechnen der Kettenlänge"
          key="desc"
        />
        <meta property="og:title" content="Kettenlänge" />
        <meta
          property="og:description"
          content="Tool zum Berechnen der Kettenlänge"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Link color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Kettenlänge!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          In diesem Tool kannst du die theoretische Kettenlänge deines Fahrrades
          berechnen.
        </p>
      </div>
      <div className="px-6 py-3">
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="lKettenstrebe">
            Kettenstrebenlänge (in mm)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="lKettenstrebe"
            id="lKettenstrebe"
            placeholder="gewöhnlich ~ 420mm"
            required
          />
          <label className="block mb-3" htmlFor="ZKettenblatt">
            Zähnezahl größtes Kettenblatt (vorne)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZKettenblatt"
            id="ZKettenblatt"
            placeholder="~ 44"
            required
          />
          <label className="block mb-3" htmlFor="ZRitzel">
            Zähnezahl größtes Ritzel (hinten)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="ZRitzel"
            id="ZRitzel"
            placeholder="~ 28"
            required
          />
          <label className="block mb-3" htmlFor="Schaltungsröllchen">
            Zähnezahl Schaltungsröllchen
          </label>
          <select
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            id="Schaltungsroellchen"
            name="Schaltungsroellchen"
            required
          >
            <option value="10">10</option>
            <option value="11" selected="">
              11
            </option>
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
              Die <a className="underline">Kettenstrebenlänge</a> ist der
              Abstand zwischen dem Tretlager und der Hinterradachse.<br></br>Das
              <a className="underline">Schaltungsröllchen</a> ist am hinteren
              Schaltwerk das kleine Ritzel zur Führung der Kette.
            </p>
            <p>
              <img src="Kettenlaenge.png" className="rounded-lg mx-auto mt-6" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
