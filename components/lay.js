import Alert from "../components/alert";
import Footer from "../components/footer";
import Meta from "../components/meta";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Head from "next/head";

export default function Lay({ preview, children }) {
  return (
    <>
      <link rel="icon" href="/favicon.ico" />
      <div className="min-h-screen">
        <Head>
          <title>Individueller GPS Track</title>
        </Head>
        <HeaderComponent></HeaderComponent>
        <main>{children}</main>
        <FooterComponent></FooterComponent>
      </div>
    </>
  );
}
