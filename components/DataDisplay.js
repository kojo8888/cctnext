import React, { useState, useEffect } from "react";

const DataDisplay = ({ checkboxState }) => {
  const [apiData, setApiData] = useState([]);

  const apiUrl = "/api/Packliste";

  const fetchData = async () => {
    try {
      const response = await fetch(apiUrl);
      const responseData = await response.json();

      if (checkboxState.checkbox1) {
        //Nass und kalt
        const allData = responseData
          .filter((els) => els.location == "kalt")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setApiData(allData);
      }
      if (checkboxState.checkbox2) {
        //Werkzeug
        const allData = responseData
          .filter((els) => els.category == "Werkzeug")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setApiData(allData);
      }
      if (checkboxState.checkbox3) {
        //Elektronik
        const allData = responseData
          .filter((els) => els.category == "Elektronik")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setApiData(allData);
      }
      if (checkboxState.checkbox4) {
        //Ersatzteile
        const allData = responseData
          .filter((els) => els.category == "Ersatzteile")
          .map(function (liste) {
            return <p key={liste.id}>{liste.name}</p>;
          });

        setApiData(allData);
      } else {
        // // Reset data if checkbox1 is not checked
        // const allData = responseData.map((item) => (
        //   <p key={item.id}>
        //     <a href={item.url}>{item.name}</a>
        //   </p>
        // ));
        // setApiData(allData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setApiData([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [checkboxState]);

  return (
    <div className="space-y-12">
      <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        {apiData.length > 0 ? apiData : <p>Keine Daten vorhanden</p>}
      </div>
    </div>
  );
};

export default DataDisplay;
