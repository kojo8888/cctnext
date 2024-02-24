import Head from "next/head";
// import StravaElapsedTime from "../components/strava/StravaElapsedTime";
import StravaSegmentKOM from "../components/strava/StravaSegmentKOM";

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
        <StravaSegmentKOM />
      </div>
    </div>
  );
}
