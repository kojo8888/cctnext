import React from "react";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";

function convertTimeToSeconds(timeString) {
  const [minutes, seconds] = timeString.split(":").map(Number);
  return minutes * 60 + seconds;
}

const StravaListSegments = () => {
  const { data, error } = useSWR("/api/Strava/stravafetchsegments", fetcher);
  if (error) return <div>Failed to load segments</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h2>Segments</h2>
      {data.map((segment) => {
        const komTimeInSeconds = segment.xoms
          ? convertTimeToSeconds(segment.xoms.kom)
          : "N/A";

        return (
          <div key={segment.id}>
            <p>Name: {segment.name}</p>
            <p>Distance: {segment.distance}</p>
            <p>Average Grade: {segment.avg_grade}%</p>
            {segment.xoms && (
              <div>
                <p>
                  KOM: {segment.xoms.kom} ({komTimeInSeconds} s)
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StravaListSegments;
