// import { getSortedPostsData } from "../lib/posts";
import Link from "next/link";
import { useRouter } from "next/router";
import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
}

export default function Home({ allPostsData }) {
  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <HeaderComponent></HeaderComponent>
      <section className="{`${utilStyles.headingMd} ${utilStyles.padding3px}`}">
        <ul className="{utilStyles.list}">
          {allPostsData.map(({ id, date, title }) => (
            <li className="{utilStyles.listItem} key={id}">
              {title}
              <br />
              {date}
            </li>
          ))}
        </ul>
      </section>

      <FooterComponent></FooterComponent>
    </div>
  );
}
