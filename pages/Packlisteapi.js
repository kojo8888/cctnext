import Head from "next/head";
import { useState, useEffect } from "react";

export default function Home() {
  const [showPosts, setshowPosts] = useState();
  const apiUrl = "/api/liste";
  let displayData;

  function pullJson() {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        displayData = responseData.map(function (liste) {
          return <p key={liste.id}>{liste.name}</p>;
        });

        //console.log(responseData);
        setshowPosts(displayData);
      });
  }

  useEffect(() => {
    pullJson();
  }, []);

  return (
    <div>
      <main>
        <p>Test</p>
        {showPosts}
      </main>
    </div>
  );
}
