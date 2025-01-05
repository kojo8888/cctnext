import Head from "next/head";
import { Component } from "react";
import styles from "../styles/Home.module.css";
import MapOverpassMallorca from "../components/MapOverpassMallorca";
import { Map } from "react-feather";

export default class Main extends Component {
  constructor(props) {
    super(props);

    this.zoomOut = this.zoomOut.bind(this);
    this.state = {};
  }

  async zoomOut() {
    console.log("Zooming Out");
  }

  componentDidMount() {}

  render() {
    return (
      <div className={styles.container}>
        <Head>
          <title>Standard GPX</title>
          <meta name="description" content="Location-based Stories" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="font-mono mt-3 mx-auto text-center max-w-3xl px-10">
          <p className="flex justify-center mt-6">
            <Map color="black" />
          </p>
          <p className="mt-12 text-3xl font-extrabold text-gray-900 tracking-tight">
            Strecken, Tipps und mehr für Mallorca
          </p>
          <p className="mt-12 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
            
          </p>
          <div>
            <main className={styles.map}>
              <MapOverpassMallorca />
            </main>
          </div>
        </div>
      </div>
    );
  }
}
