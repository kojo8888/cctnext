import Link from "next/link";

function HeaderComponent() {
  return (
    <div className="py-8 font-mono font-bold flex justify-center text-gray-800 space-x-10 pb-10">
      <Link href="/">Home</Link>

      <Link href="gps">GPS Tracks</Link>

      <Link href="tips">Tips & Packing</Link>

      <Link href="tools">Tools</Link>
    </div>
  );
}
export default HeaderComponent;
