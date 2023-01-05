import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function Home() {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <HeaderComponent></HeaderComponent>
      <p className="mt-12 text-3xl font-extrabold text-gray-900 tracking-tight">
        Keine Lust auf stundenlange Routenplanung?
      </p>

      <h1>Welcome!</h1>

      <FooterComponent></FooterComponent>
    </div>
  );
}
