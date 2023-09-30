import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import { Component } from "react";
import styles from "../styles/Home.module.css";
import MapApp from "../components/mapApp";

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
        <HeaderComponent></HeaderComponent>
        <main className={styles.main}>
          <MapApp
            width="50vw"
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