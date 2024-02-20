import Head from "next/head";
// import StravaElapsedTime from "../components/strava/StravaElapsedTime";
import StravaListSegments from "../components/strava/StravaListSegments";

export default function Home() {
  return (
    <div>
      <Head>
        <title>Dashboard</title>
      </Head>
      <div className="container">
        <h1 style={{ padding: "100px 0 10px 0" }} className="text-center">
          Konsti's Dashboard
        </h1>

        {/* <StravaElapsedTime /> */}
        <StravaListSegments />
      </div>
    </div>
  );
}
