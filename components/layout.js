import Alert from "../components/alert";
import Meta from "../components/meta";

export default function Layout({ preview, children }) {
  return (
    <>
      <link rel="icon" href="/favicon.ico" />
      <Meta />
      <div className="min-h-screen">
        <main>{children}</main>
      </div>
    </>
  );
}
