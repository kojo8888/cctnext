import { useState, useEffect } from "react";
import Head from "next/head";
import { Umbrella } from "react-feather";

export default function ExampleCheckbox() {
  const [allData, setAllData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // State for selected category
  const apiUrl = "/api/Strava";

  // Fetch the data and update the state
  useEffect(() => {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        const formattedData = responseData.map((item) => ({
          id: item.id,
          name: item.name,
          link: item.link,
          rating: item.rating,
          category: item.category,
          subcategory: item.subcategory,
        }));
        setAllData(formattedData);
      });
  }, [apiUrl]);

  // Filter data based on selected category
  const filteredData = selectedCategory
    ? allData.filter((item) => item.category === selectedCategory)
    : allData;

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Tools</title>
        <meta name="description" content="Strava Add-ons" key="desc" />
        <meta property="og:title" content="Nützliche Tools für Radler" />
        <meta property="og:description" content="Liste mit Strava Add-ons" />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <Umbrella color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Strava Add-ons!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Schau mal, was es noch so gibt..
        </p>
      </div>
      <div className="space-y-12">
        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-3xl font-semibold text-gray-900">
            Strava Add-ons
          </h3>

          {/* Filter button */}
          <div className="mb-4 bg-red-100">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`mr-2 ${
                selectedCategory === null && "bg-red-300 text-gray-500"
              }`}
            >
              All
            </button>
            {Array.from(new Set(allData.map((item) => item.category))).map(
              (category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`mr-2 ${
                    selectedCategory === category && "bg-red-300 text-gray-500"
                  }`}
                >
                  {category}
                </button>
              )
            )}
          </div>

          {/* Table */}
          <table className="table-auto">
            <thead>
              <tr>
                {/* <th>Name</th> */}
                {/* <th>Kategorie</th> */}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <a className="hover:underline" href={item.link}>
                      {item.name}
                    </a>
                  </td>
                  {/* <td>{item.category}</td> */}
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
