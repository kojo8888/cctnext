import Head from "next/head";

export default function Home(props) {
  const posts = props.posts;
  return (
    <div style={{ padding: 30 }}>
      <Head>
        <title>Biketube</title>
      </Head>
      <div>
        {posts.map((post) => (
          <div
            key={post.id}
            style={{ padding: 20, borderBottom: "1px solid #ccc" }}
          >
            <h2>{post.name}</h2>
            <p>{post.category}</p>
            <p>{post.description}</p>
            <p>{post.url}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fetching data from the JSON file
import fsPromises from "fs/promises";
import path from "path";
import { Link } from "react-feather";
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), "biketube.json");
  const jsonData = await fsPromises.readFile(filePath);
  const objectData = JSON.parse(jsonData);

  return {
    props: objectData,
  };
}
