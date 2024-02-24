import React from "react";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";

const StravaListSegments = () => {
  const { data, error } = useSWR("/api/stravafetchsegments", fetcher);
  if (error) return <div>Failed to load segments</div>;
  if (!data) return <div>Loading...</div>;
  // console.log(data);
  return (
    <div>
      <h2>Segments</h2>

      {data.map((segment) => (
        <div key={segment.id}>
          <p>Name: {segment.name}</p>
          <p>Distance: {segment.distance}</p>
          <p>Average Grade: {segment.avg_grade}%</p>
        </div>
      ))}
    </div>
  );
};

export default StravaListSegments;
