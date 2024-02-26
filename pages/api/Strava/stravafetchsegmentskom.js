export default async (req, res) => {
  var key = process.env.STRAVA_KEY;
  const segmentId = "8461077"; // Example segment ID

  var key = process.env.STRAVA_KEY;

  const response = await fetch(
    `https://www.strava.com/api/v3/segments/${segmentId}?access_token=${key}`
  );
  const json = await response.json();
  // console.log(json);
  const xoms = json.xoms;
  console.log(xoms);
  return res.status(200);
};
