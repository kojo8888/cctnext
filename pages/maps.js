import Head from "next/head";
import Image from "next/image";
import { Component } from "react";
import styles from "../styles/Home.module.css";
import Map from "../components/map";

export default class Main extends Component {
  constructor(props) {
    super(props);
    this.flyTo = this.flyTo.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.state = {};
  }

  async flyTo(event) {
    const lng = event.target.dataset.lng;
    const lat = event.target.dataset.lat;

    const trigger = document.getElementById("trigger");
    trigger.setAttribute("data-lat", lat);
    trigger.setAttribute("data-lng", lng);
    trigger.click();
  }

  async zoomOut() {
    console.log("Zooming Out");
  }

  componentDidMount() {}

  render() {
    return (
      <div className={styles.container}>
        <Head>
          <title>Next Map</title>
          <meta name="description" content="Location-based Stories" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className={styles.main}>
          <Map
            width="100vw"
            height="65vh"
            data={this.props.datedSortedPosts}
            zoom="5"
            lng="2.800029"
            lat="39.834872"
          />
        </main>
      </div>
    );
  }
}
