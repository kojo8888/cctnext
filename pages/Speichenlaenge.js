import Head from "next/head";
import { Loader } from "react-feather";

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
    lS = Number.parseFloat(lS).toFixed(2);

    // Ausgabe
    alert(`Deine Speichenlänge ist ${lS} mm!`);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Speichenlänge</title>
        <meta
          name="description"
          content="Tool zum Berechnen der Speichenlänge"
          key="desc"
        />
        <meta property="og:title" content="Speichenlänge" />
        <meta
          property="og:description"
          content="Tool zum Berechnen der Speichenlänge"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Loader color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Speichenlänge!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Dieser Ritzelrechner zeigt dir, welche Gänge welche Übersetzung haben.
        </p>
      </div>
      <div className="px-6 py-3">
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="D">
            Durchmesser durch Speichenenden (in mm)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="D"
            id="D"
            placeholder="D"
            required
          />
          <label className="block mb-3" htmlFor="N">
            Durchmesser Nabenflansch-Lochkreis (in mm)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="N"
            id="N"
            placeholder="d"
            required
          />
          <label className="block mb-3" htmlFor="A">
            Abstand Flansch zur Mittelachse (in mm)
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="A"
            id="A"
            placeholder="a"
            required
          />
          <label className="block mb-3" htmlFor="K">
            Anzahl der Speichenkreuzungen
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="K"
            id="K"
            required
          />
          <label className="block mb-3" htmlFor="Z">
            Speichenanzahl
          </label>
          <input
            className="text-gray-900 text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="Z"
            id="Z"
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
              In diesem Tool kannst du die Speichenlänge für deine Laufräder
              berechnen.<br></br>
              <br></br>Der <a class="underline">Durchmesser D</a> läßt sich wie
              folgt ermitteln: Zwei Speichen auf der Kopfseite auf 250 mm
              kürzen. Die Speichen bündig in die Nippel schrauben. Die Speichen
              anschließend gegenüberliegend in der Felge einhängen. Der Abstand
              der inneren Speichenenden ergibt zusammen mit den Längen der
              gekürzten Speichen den gefragten Durchmesser.
            </p>
            <p>
              <img
                src="Speichenlaenge.png"
                className="rounded-lg mx-auto mt-6"
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
