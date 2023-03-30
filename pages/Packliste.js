import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function Home(props) {
  const posts = props.posts;
  return (
    <div style={{ padding: 30 }}>
      <Head>
        <title>Packliste</title>
      </Head>
      <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
        <HeaderComponent></HeaderComponent>
      </div>
      <div>
        {posts.map((post) => (
          <div
            key={post.id}
            style={{ padding: 20, borderBottom: "1px solid #ccc" }}
          >
            <h2>{post.name}</h2>
            <p>{post.kategorie}</p>
          </div>
        ))}
        <FooterComponent></FooterComponent>
      </div>
    </div>
  );
}

// Fetching data from the JSON file
import fsPromises from "fs/promises";
import path from "path";
import { Link } from "react-feather";
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), "packliste.json");
  const jsonData = await fsPromises.readFile(filePath);
  const objectData = JSON.parse(jsonData);

  return {
    props: objectData,
  };
}
