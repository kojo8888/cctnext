export default function test() {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <div className="mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        <img
          src="../../Avatar.png"
          className="rounded-full w-32 mb-4 mx-auto"
        />
        <p className="mt-6 mb-6 text-gray-500">Das ist Konstantin</p>
        <a
          className="mt-6 mb-6 text-gray-500"
          href="https://www.strava.com/athletes/19506898"
          title="Strava"
        >
          Strava
        </a>
        <p className="mt-5 text-gray-500">
          Die Seite entstand aus der Idee, sich mehr mit Datenauswertung und
          Webentwicklung zu beschäftigen. Als aktiver Strava-Junky und
          Streckenbauer blieb da eigentlich nur eine Verknüpfung der beiden
          Hobbies übrig.
        </p>
      </div>

      <div className="mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        <img
          src="../Avatar.png"
          className="rounded-full w-32 mb-4 mx-auto"
          alt="Avatar"
        />
        <p className="mt-6 text-gray-500 text-center">Das ist Svenja</p>
        <p className="mt-5 text-gray-500">Wer QOM sucht, ist hier richtig.</p>
      </div>

      <div className="mb-10 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        <img
          src="../Avatar.png"
          className="rounded-full w-32 mb-4 mx-auto"
          alt="Avatar"
        />
        <p className="mt-6 text-gray-500 text-center">Das ist Tim</p>
        <p className="mt-5 text-gray-500">Tim ist der Pendler und Styler.</p>
      </div>
      <div className="mb-10 p-8">
        <a
          href="https://forms.aweber.com/form/40/1727432440.htm"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Frequent updates
        </a>
      </div>
    </div>
  );
}
