export default function sitemap() {
  const baseUrl = "https://www.customcyclingtracks.com";
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: baseUrl + "/gps",
      lastModified: new Date(),
    },
    {
      url: baseUrl + "/tips",
      lastModified: new Date(),
    },
    {
      url: baseUrl + "/tools",
      lastModified: new Date(),
    },
  ];
}
