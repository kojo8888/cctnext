export default async (req, res) => {
  var key = process.env.STRAVA_KEY;
  const response = await fetch(
    "https://www.strava.com/api/v3/athletes/131891480/stats?access_token=" + key
  );
  const json = await response.json();

  const movingTime = json.all_ride_totals.distance;
  return res.status(200).json({
    movingTime,
  });
};
