import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";
import { useEffect } from "react";
import { Chart } from "chart.js";

export default function Ritzelrechner() {
  const submitContact = async (event) => {
    event.preventDefault();

    //Variablen zum Abfragen
    const ZR = event.target.ZR.value;
    const ZK = event.target.ZK.value;
    //const ZRh = event.target.ZRh.value;
    //const ZRk = event.target.ZRk.value;
    //const ZKh = event.target.ZKh.value;
    //const ZKk = event.target.ZKk.value;
    //const U = event.target.U.value;
    const wd = event.target.wd.value;
    const wb = event.target.wb.value;
    const Cad = event.target.Cad.value;

    //Gesucht
    //Bandbreite
    var Bb;
    //Geschwindigkeit
    let vh;
    let vk;
    //Übersetzung
    let Ü;
    var Üh;
    var Ük;
    //Entfaltung,Development
    let Dev;
    //var s;
    //Umfang
    var Umf;

    //
    var Gk;
    var Gh;
    var Devh;
    var Devk;

    //Übersetzung h
    var ZRarr = ZR.split(",");
    var ZKarr = ZK.split(",");
    const Ügr = ZRarr.map(myFunction);
    function myFunction(num) {
      return num / ZKarr[1];
    }
    const Ükl = ZRarr.map(myF);
    function myF(num) {
      return num / ZKarr[0];
    }
    console.log(Ügr);
    console.log(Ükl);

    //Umfang in m
    Umf = ((parseInt(wb) * 2 + parseInt(wd)) * Math.PI) / 1000;
    Umf = Number.parseFloat(Umf).toFixed(2);
    console.log(Umf);

    //Entfaltung
    const Devgr = Ügr.map(myFu);
    function myFu(num) {
      return Umf / num;
    }
    console.log(Devgr);

    const Devkl = Ükl.map(mF);
    function mF(num) {
      return Umf / num;
    }
    console.log(Devkl);

    //Entfaltung bei Cad in m
    const sgr = Devgr.map(myFunc);
    function myFunc(num) {
      return parseInt(Cad) * Umf * num;
    }
    console.log(sgr);
    const skl = Devkl.map(myFun);
    function myFun(num) {
      return parseInt(Cad) * Umf * num;
    }
    console.log(skl);
    // s = parseInt(Cad) * Umf * Ü;

    //Geschwindigkeit in km/h
    const vgr = Devgr.map(myFunct);
    function myFunct(num) {
      return (num * parseInt(Cad) * 60) / 1000;
    }
    console.log(vgr);
    const vkl = Devkl.map(myFuncti);
    function myFuncti(num) {
      return (num * parseInt(Cad) * 60) / 1000;
    }
    console.log(vkl);
    // vh = (Devh * parseInt(Cad) * 60) / 1000;
    // vh = Number.parseFloat(vh).toFixed(2);
    // vk = (Devk * parseInt(Cad) * 60) / 1000;
    // vk = Number.parseFloat(vk).toFixed(2);
    //Bandbreite
    // Gk = ZRk / ZKk;
    // Gh = ZKh / ZRh;
    // Bb = Gk / Gh;
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Ritzelrechner</title>
      </Head>
      <HeaderComponent></HeaderComponent>
      <div className="px-6 py-3">
        <div className="mb-3 text-xl font-bold">Ritzelrechner</div>
        <form className="flex flex-col" onSubmit={submitContact}>
          <label className="block mb-3" htmlfor="ZR">
            Schaltung
          </label>
          <select
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            id="ZR"
            name="ZR"
            required
          >
            <option value="10,11,12">10, 11, 12</option>
            <option value="13,14,15">13, 14, 15</option>
          </select>
          <label className="block mb-3" htmlfor="ZR">
            Schaltung
          </label>
          <select
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            id="ZK"
            name="ZK"
            required
          >
            <option value="34,50">34, 50</option>
            <option value="40,52">40, 52</option>
          </select>
          <label className="block mb-3" htmlfor="wd">
            Laufraddurchmesser (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wd"
            placeholder="Rennrad ~ 622mm"
            id="wd"
            required
          />
          <label className="block mb-3" htmlfor="wb">
            Breite (in mm)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="wb"
            placeholder="Rennrad ~ 23mm"
            id="wb"
            required
          />
          <label className="block mb-3" htmlfor="Cad">
            Trittfrequenz (in 1/U)
          </label>
          <input
            className="text-center w-half p-3 mb-3 border border-gray-400 border-solid rounded-lg"
            type="number"
            name="Cad"
            id="Cad"
            required
          />
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
