import { useState, useEffect } from "react";
import Head from "next/head";
import { Youtube } from "react-feather";

export default function ExampleCheckbox() {
  const [allData, setAllData] = useState([]);
  const apiUrl = "/api/Bikeflix";

  // Fetch the data and update the state
  useEffect(() => {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        const formattedData = responseData.map((item) => ({
          id: item.id,
          name: item.name,
          url: item.url,
          description: item.description,
        }));
        setAllData(formattedData);
      });
  }, [apiUrl]);

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
      <div mb-9>
        <p className="flex justify-center mt-6">
          <Youtube color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Bikeflix!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Video Shortlist.
        </p>
      </div>
      <div className="space-y-12">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">Bikeflix</h3>
          {/* <ul role="list" className="mt-6 space-y-6">
            <li className="flex">
              <span className="ml-3 text-left">{showWerkzeug}</span>
            </li>
          </ul> */}
          <table className="table-auto">
            <thead>
              <tr>
                {/* <th>ID</th> */}
                <th>Name</th>
                {/* <th>URL</th> */}
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {allData.map((item) => (
                <tr key={item.id}>
                  {/* <td>{item.id}</td> */}
                  <td>
                    <a href={item.url}>{item.name}</a>
                  </td>
                  {/* <td>{item.url}</td> */}
                  <td>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
