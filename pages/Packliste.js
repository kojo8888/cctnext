// import Table from "./Table";
import Table from "../components/Table";
import data from "../data.json";

function Packl() {
  const getHeadings = () => {
    return Object.keys(data[0]);
  };

  return (
    <div className="container">
      <Table theadData={getHeadings()} tbodyData={data} />
    </div>
  );
}
export default Packl;
