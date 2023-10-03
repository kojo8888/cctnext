import "../styles/globals.css";
import Lay from "../components/lay";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Lay>
        <Component {...pageProps} />
        <Script
          strategy="lazyOnload"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}`}
        />

        <Script strategy="lazyOnload">
          {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}', {
                    page_path: window.location.pathname,
                    });
                `}
        </Script>
        {/* <Analytics /> */}
      </Lay>
    </>
  );
}
