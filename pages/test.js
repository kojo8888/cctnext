import { useState, useEffect } from "react";

export default function ExampleCheckbox() {
  const [showPosts, setshowPosts] = useState();
  const apiUrl = "/api/liste";
  let displayData;

  function pullJson() {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((responseData) => {
        displayData = responseData.map(function (liste) {
          return <p key={liste.id}>{liste.category}</p>;
        });

        //console.log(responseData);
        // setshowPosts(displayData);
      });
  }

  useEffect(() => {
    pullJson();
  }, []);

  const handleClick = (event) => {
    if (event.target.checked === true) {
      console.log("Checked");
      setshowPosts(displayData);
    } else {
      console.log("Not Checked");
    }
  };

  return (
    <>
      <label htmlFor="example_checkbox">Warm</label>
      <input
        type="checkbox"
        id="example_checkbox"
        onClick={(event) => handleClick(event)}
      />
      <div>
        <main>
          <p>Test</p>
          {showPosts}
        </main>
      </div>
    </>
  );
}
