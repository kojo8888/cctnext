import Link from "next/link";

function FooterComponent() {
  return (
    <div className="py-8 font-mono font-bold flex justify-center text-gray-800 space-x-10 pb-10">
      <Link href="aboutus">Über uns</Link>

      <Link href="Datenschutz">Datenschutz</Link>

      <Link href="Impressum">Impressum</Link>
    </div>
  );
}
export default FooterComponent;
