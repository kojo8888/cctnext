import { useState, useEffect } from "react";
import { Plus } from "react-feather";
import Head from "next/head";

export default function ExampleCheckbox() {
  const [showWerkzeug, setshowWerkzeug] = useState();

  // const [showVplatz, setshowVplatz] = useState();
  const apiUrl = "/api/Bikeflix";
  let allData;

  function pullJson() {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        allData = responseData
          // .filter((el) => el.category == "Werkzeug")
          .map(function (liste) {
            return (
              <p key={liste.id}>
                {liste.name}
                {/* {liste.url}
                {liste.description} */}
              </p>
            );
          });
        setshowWerkzeug(allData);
      });
  }

  useEffect(() => {
    pullJson();
  }, []);

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Bikeflix</title>
        <meta
          name="description"
          content="Die besten Youtube Videos zum Thema Radreparatur"
          key="desc"
        />
        <meta property="og:title" content="Bikeflix" />
        <meta
          property="og:description"
          content="Die besten Youtube Videos zum Thema Radreparatur"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      {/* <HeaderComponent></HeaderComponent> */}

      <div className="space-y-12">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Bikeflix</h3>
          <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-left">{showWerkzeug}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="p-8">
        <a
          href="mailto:customcyclingtracks@gmx.net"
          className="font-medium text-white hover:bg-blue-600 bg-blue-500 px-3 py-2 -mt-2 rounded-lg"
        >
          Schreib uns
        </a>
      </div>

      {/* <FooterComponent></FooterComponent> */}
    </div>
  );
}
