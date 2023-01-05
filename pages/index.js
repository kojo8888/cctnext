import Head from "next/head";
import HeaderComponent from "../components/Header";
import FooterComponent from "../components/Footer";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Home({ props }) {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;
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
