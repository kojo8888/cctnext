async function fetchSegmentKOM(segmentId, key) {
  const response = await fetch(
    `https://www.strava.com/api/v3/segments/${segmentId}?access_token=${key}`
  );
  const json = await response.json();
  return json.xoms; // Assuming xoms contains KOM information
}

export default async (req, res) => {
  const key = process.env.STRAVA_KEY;
  const { bounds } = req.query;

  const exploreResponse = await fetch(
    `https://www.strava.com/api/v3/segments/explore?bounds=${bounds}&access_token=${key}`
  );
  const { segments } = await exploreResponse.json();
  console.log(segments);
  const segmentsWithKOM = await Promise.all(
    segments.map(async (segment) => {
      const xoms = await fetchSegmentKOM(segment.id, key);
      return {
        ...segment,
        xoms,
      };
    })
  );

  res.status(200).json(segmentsWithKOM);
};
