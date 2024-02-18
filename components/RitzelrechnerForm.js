export default function RitzelrechnerForm({
  formData,
  setFormData,
  handleSubmit,
  ritzelNames,
  kettenblattNames,
  handleRitzelChange,
  handleKettenblattChange,
}) {
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <label className="block mb-1" htmlFor="wd">
            Laufraddurchmesser
          </label>
          <input
            className="text-center bg-white text-black w-20 p-3 mb-3 border border-solid rounded-lg"
            type="number"
            name="wd"
            value={formData.wd}
            onChange={handleInputChange}
            placeholder="wd"
          />
        </div>
        <div className="basis-1/3">
          <label className="block mb-1" htmlFor="wb">
            Reifenbreite
          </label>
          <input
            className="text-center bg-white text-black w-20 p-3 mb-3 border border-solid rounded-lg"
            type="number"
            name="wb"
            value={formData.wb}
            onChange={handleInputChange}
            placeholder="wb"
          />
        </div>
        <div className="basis-1/3">
          <label className="block mb-1" htmlFor="Cad">
            Trittfrequenz
          </label>
          <input
            className="text-center bg-white text-black w-20 p-3 mb-3 border border-solid rounded-lg"
            type="number"
            name="Cad"
            value={formData.Cad}
            onChange={handleInputChange}
            placeholder="Cad"
          />
        </div>
      </div>
      <div className="flex flex-row gap-3">
        <div>
          <label htmlFor="ritzel">Ritzel:</label>
          <select
            className="text-center bg-white text-black p-3 mb-3 border border-solid rounded-lg"
            name="ritzel"
            value={selectedRitzel}
            onChange={handleRitzelChange}
          >
            {ritzelNames.map((name, index) => (
              <option key={index} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="kettenblatt">Kettenblatt:</label>
          <select
            className="text-center bg-white text-black p-3 mb-3 border border-solid rounded-lg"
            name="kettenblatt"
            value={selectedKettenblatt}
            onChange={handleKettenblattChange}
          >
            {kettenblattNames.map((name, index) => (
              <option key={index} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="font-mono mt-1 mb-3 mx-auto text-center max-w-lg px-10">
        <button
          className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          type="submit"
        >
          Rechnen
        </button>
      </div>
    </form>
  );
}
