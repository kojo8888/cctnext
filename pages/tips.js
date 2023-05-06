import Container from "../components/container";
import MoreStories from "../components/more-stories";
import Intro from "../components/intro";
import Layout from "../components/layout";
import { getAllPosts } from "../lib/api";
import Head from "next/head";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export default function tips({ allPosts }) {
  const morePosts = allPosts.slice(0);
  return (
    <>
      <Layout>
        <Head>
          <title>Tips&Tricks</title>
        </Head>
        <HeaderComponent></HeaderComponent>
        <Container>
          <Intro />

          {morePosts.length > 0 && <MoreStories posts={morePosts} />}
        </Container>
        <FooterComponent></FooterComponent>
      </Layout>
    </>
  );
}

export async function getStaticProps() {
  const allPosts = getAllPosts([
    "title",
    "date",
    "slug",
    "author",
    "coverImage",
    "excerpt",
  ]);

  return {
    props: { allPosts },
  };
}
