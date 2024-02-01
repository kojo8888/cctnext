import Head from "next/head";
import { Component } from "react";
import styles from "../styles/Home.module.css";
import MapStd from "../components/mapStd";
import { Map } from "react-feather";

export default class Main extends Component {
  constructor(props) {
    super(props);
    // this.flyTo = this.flyTo.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.state = {};
  }

  // async flyTo(event) {
  //   const lng = event.target.dataset.lng;
  //   const lat = event.target.dataset.lat;

  //   const trigger = document.getElementById("trigger");
  //   trigger.setAttribute("data-lat", lat);
  //   trigger.setAttribute("data-lng", lng);
  //   trigger.click();
  // }

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
            Flaschen auffüllen, Platten?!
          </p>
          <p className="mt-12 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
            Auf der Karte oben rechts könnt ihr die verschiedenen Layer
            auswählen, um Trinkwasserbrunnen und Reparaturstationen zu finden.
          </p>
          <main className={styles.main}>
            <MapStd
              width="50vw"
              height="50vh"
              //data={this.props.datedSortedPosts}
              zoom="1"
              lng="2.800029"
              lat="42.834872"
            />
          </main>
        </div>
      </div>
    );
  }
}
