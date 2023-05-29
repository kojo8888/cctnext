import Head from "next/head";
import styles from "../styles/Home.module.css";
// import Packliste from "../pages/api/liste";
import data from "../data.json";

export default function Home() {
  const endpoints = [
    {
      name: "GET /liste",
      description: "List all the trips",
    },
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Trips API</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Trips API</h1>

        <p className={styles.description}>The documentation</p>

        <div className={styles.grid}>
          {endpoints.map((endpoint, index) => (
            <div className={styles.card} key={index}>
              <h2>
                <code>{endpoint.name}</code>
              </h2>
              <p>{endpoint.description}</p>
              <p>...</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
