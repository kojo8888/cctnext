// import Table from "./Table";
import Table from "../components/Table";
import data from "../data.json";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";

function Packliste() {
  const getHeadings = () => {
    return Object.keys(data[0]);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-7xl px-10">
      <Head>
        <title>Packliste</title>
      </Head>
      <HeaderComponent></HeaderComponent>
      <div className="container">
        <Table theadData={getHeadings()} tbodyData={data} />
      </div>
      <FooterComponent></FooterComponent>
    </div>
  );
}
export default Packliste;
