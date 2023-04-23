import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function Ritzelrechner() {
  const submitContact = async (event) => {
    event.preventDefault();
    var ZL;
    const ZK = event.target.ZK.value;
    if (ZK === "[Campagnolo Ekar - 39]") {
      ZL = 5;
    }

    //const Ü = JSON.parse("[" + ZK + "]");

    alert(`${ZL}`);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">
          Ritzelrechner und Schaltverhältnis
        </div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlFor="ZK">
            Zähnezahl Kettenblatt
          </label>
          <select
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            id="ZK"
            name="ZK"
            required
          >
            <option value="[Campagnolo Ekar - 38]">Campagnolo Ekar - 38</option>
            <option Value="[40,41]">Campagnolo Ekar - 40</option>
            <option value="Campagnolo Ekar - 42">Campagnolo Ekar - 42</option>
            <option value="Campagnolo Ekar - 44">Campagnolo Ekar - 44</option>
            <option value="Shimano 105 - 39 - 53">Shimano 105 - 39 - 53</option>
            <option value="Shimano 105 - 36 - 52">Shimano 105 - 36 - 52</option>
            <option value="Shimano 105 - 34 - 50">Shimano 105 - 34 - 50</option>
          </select>

          <button
            type="submit"
            className="px-4 py-3 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700"
          >
            Berechnen
          </button>
        </form>
      </div>
      <FooterComponent></FooterComponent>
    </div>
  );
}
