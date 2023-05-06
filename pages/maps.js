import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
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
          <title>Standard GPX</title>
          <meta name="description" content="Location-based Stories" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <HeaderComponent></HeaderComponent>

        <main className={styles.main}>
          <Map
            width="100vw"
            height="50vh"
            //data={this.props.datedSortedPosts}
            zoom="1"
            lng="2.800029"
            lat="42.834872"
          />
        </main>
        <FooterComponent></FooterComponent>
      </div>
    );
  }
}
