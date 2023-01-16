import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import { Plus } from "react-feather";

export default function Kettenlänge({ products }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <HeaderComponent></HeaderComponent>
      <form
        action="/test"
        method="POST"
        className="w-1/2 mx-auto mt-10 text-center"
      >
        <label className="block mb-3" for="lKettenstrebe">
          Kettenstrebenlänge in mm
        </label>
        <input
          className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
          type="number"
          name="lKettenstrebe"
          id="lKettenstrebe"
          placeholder="gewöhnlich ~420mm"
        />
        <label className="block mb-3" for="ZKettenblatt">
          Zähnezahl größtes Kettenblatt (vorne)
        </label>
        <input
          className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
          type="number"
          name="ZKettenblatt"
          id="ZKettenblatt"
          placeholder="~44"
        />
        <label className="block mb-3" for="ZRitzel">
          Zähnezahl größtes Ritzel (hinten)
        </label>
        <input
          className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
          type="number"
          name="ZRitzel"
          id="ZRitzel"
          placeholder="~34"
        />
        <label className="block mb-3" for="Schaltungsröllchen">
          Schaltungsröllchen
        </label>
        <select
          className="w-half p-2 mb-3 border border-gray-400 border-solid rounded-lg"
          id="Schaltungsröllchen"
          name="Schaltungsröllchen"
        >
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
        </select>
        <label> </label>
        <button
          type="submit"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Save
        </button>
      </form>
      <FooterComponent></FooterComponent>
    </div>
  );
}
