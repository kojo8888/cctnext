// Autoimport getAllPost funktioniert nicht ID von md

import { getAllPosts } from "../lib/api";

const URL = "https://customcyclingtracks.com";

function generateSiteMap(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
     <!-- Add the static URLs manually -->
    <url>
        <loc>${URL}</loc>
    </url>
    <url>
        <loc>${URL}/tips</loc>
    </url>
    <url>
        <loc>${URL}/gps</loc>
    </url>
    <url>
       <loc>${URL}/tools</loc>
    </url>
    <url>
        <loc>${URL}/posts/Mallorca</loc>
    </url>
    <url>
        <loc>${URL}/posts/Commuten</loc>
    </url>
    <url>
        <loc>${URL}/posts/Kleidung</loc>
    </url>
    <url>
        <loc>${URL}/posts/Wetter</loc>
    </url>
    <url>
        <loc>${URL}/posts/Zugfahren</loc>
    </url>
    <url>
        <loc>${URL}/posts/Packliste</loc>
    </url>
    <url>
        <loc>${URL}/posts/Standard</loc>
    </url>
    <url>
        <loc>${URL}/posts/Ernährung</loc>
    </url>
    <url>
        <loc>${URL}/posts/Erste_Tour</loc>
    </url>
    <url>
        <loc>${URL}/posts/Fahrradkette</loc>
    </url>
     ${posts
       .map(({ id }) => {
         return `
           <url>
               <loc>${`${URL}/posts/${id}`}</loc>
           </url>
         `;
       })
       .join("")}
   </urlset>
 `;
}

export async function getServerSideProps({ res }) {
  const posts = getAllPosts();

  // Generate the XML sitemap with the blog data
  const sitemap = generateSiteMap(posts);

  res.setHeader("Content-Type", "text/xml");
  // Send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function SiteMap() {}
