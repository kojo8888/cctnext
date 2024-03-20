import { useState, useEffect } from "react";
import Head from "next/head";
import { Youtube } from "react-feather";
import { YouTubeEmbed } from "@next/third-parties/google";

export default function ExampleCheckbox() {
  const [allData, setAllData] = useState([]);
  const apiUrl = "/api/Bikeflix";
  const [activeVideo, setActiveVideo] = useState(null);

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

  const handleVideoClick = (videoID) => {
    setActiveVideo(videoID);
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
        {allData.map((item) => {
          const videoID = extractVideoID(item.url);
          return (
            <div
              key={item.id}
              className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col"
            >
              <h3 className="text-3xl font-semibold text-gray-900">
                {item.name}
              </h3>
              <p className="mt-4">{item.description}</p>
              {activeVideo === videoID ? (
                <YouTubeEmbed
                  videoid={videoID}
                  height={400}
                  params="controls=0"
                />
              ) : (
                <div
                  className="relative cursor-pointer"
                  onClick={() => handleVideoClick(videoID)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`}
                    alt={item.name}
                    className="w-full"
                  />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      stroke="white"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14.752 11.168l-5.447-2.557a.5.5 0 00-.752.433v5.113a.5.5 0 00.752.433l5.447-2.557a.5.5 0 000-.865z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
