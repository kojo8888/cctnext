import Head from "next/head";
import { Component } from "react";
import styles from "../styles/Home.module.css";
import MapOverpass from "components/MapOverpass";

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
        {/* <main className={styles.main}> */}
        <main>
          <MapOverpass
            width="50vw"
            height="50vh"
            zoom="1"
            lng="2.800029"
            lat="42.834872"
          />
        </main>
      </div>
    );
  }
}
