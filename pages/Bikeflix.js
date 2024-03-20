import { useState, useEffect } from "react";
import Head from "next/head";
import { Youtube } from "react-feather";
import { YouTubeEmbed } from "@next/third-parties/google";

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

  // Function to extract YouTube video ID from shortened URL format
  const extractVideoID = (url) => {
    return url.split("=")[1];
  };

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
      <div className="mb-9">
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
        {allData.map((item) => (
          <div
            key={item.id}
            className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col"
          >
            <h3 className="text-3xl font-semibold text-gray-900">
              {item.name}
            </h3>
            <p className="mt-4">{item.description}</p>
            {/* Embed YouTube Video */}
            <YouTubeEmbed
              videoid={extractVideoID(item.url)}
              height={400}
              params="controls=0"
            />
          </div>
        ))}
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
