import React, { useState } from "react";
import CheckboxGroup from "../components/CheckboxGroup";
import DataDisplay from "../components/DataDisplay";
import Head from "next/head";

const YourPage = () => {
  const [checkboxState, setCheckboxState] = useState({
    checkbox1: false,
    checkbox2: false,
    checkbox3: false,
    checkbox4: false,
  });

  const handleCheckboxChange = (newState) => {
    setCheckboxState(newState);
  };

  return (
    <div>
      <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
        <Head>
          <title>Packliste</title>
          <meta
            name="description"
            content="Packlisten für Rennradfahrer"
            key="desc"
          />
          <meta property="og:title" content="Packliste" />
          <meta
            property="og:description"
            content="Packlisten für Rennradfahrer"
          />
          <meta
            property="og:image"
            content="https://www.customcyclingtracks.com/Logo.png"
          />
        </Head>
        <h3 className="text-3xl font-semibold text-gray-900">Strava Add-ons</h3>
        <CheckboxGroup onCheckboxChange={handleCheckboxChange} />
        <DataDisplay checkboxState={checkboxState} />
      </div>
    </div>
  );
};

export default YourPage;
