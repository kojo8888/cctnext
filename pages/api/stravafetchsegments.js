export default async (req, res) => {
  var key = process.env.STRAVA_KEY;
  const bounds = "48.105632,11.409105,48.205632,11.509105";

  const response = await fetch(
    `https://www.strava.com/api/v3/segments/explore?bounds=${bounds}&access_token=${key}`
  );
  const json = await response.json();
  console.log(json);
  const segments = json.segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    distance: segment.distance,
    average_grade: segment.average_grade,
  }));

  return res.status(200).json(segments);
};
