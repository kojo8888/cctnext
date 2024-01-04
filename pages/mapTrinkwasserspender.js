import { Component } from "react";
import styles from "../styles/Home.module.css";
import MapOverpass from "../components/MapOverpass";
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
      <div className="font-mono mt-3 mx-auto text-center max-w-3xl px-10">
        <p className="flex justify-center mt-6">
          <Map color="black" />
        </p>
        <p className="mt-12 text-3xl font-extrabold text-gray-900 tracking-tight">
          Flaschen auffüllen, Platten?!
        </p>

        <p className="mt-12 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Auf der Karte oben rechts könnt ihr die verschiedenen Layer auswählen,
          um Trinkwasserbrunnen und Reparaturstationen zu finden.
        </p>
        <div className={styles.container}>
          {/* <main className={styles.main}> */}
          <main>
            <MapOverpass
              width="50vw"
              height="50vh"
              zoom="1"
              lng="12.800029"
              lat="48.834872"
            />
          </main>
        </div>
      </div>
    );
  }
}
