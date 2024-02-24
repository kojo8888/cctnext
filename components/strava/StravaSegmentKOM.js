import React from "react";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";

const StravaSegmentKOM = () => {
  const { data, error } = useSWR("/api/stravafetchsegmentskom", fetcher);

  if (error) return <div>Failed to load KOM/QOM information</div>;
  if (!data) return <div>Loading...</div>;

  // Helper function to convert seconds to HH:MM:SS format
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    return [hours, minutes, seconds]
      .map((v) => (v < 10 ? "0" + v : v))
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  return (
    <div>
      <h2>KOM/QOM Details</h2>
      {data ? (
        <div>
          {/* <p>Athlete Name: {data.athleteName}</p> */}
          {/* <p>Elapsed Time: {formatTime(data.elapsedTime)}</p> */}
          {/* <p>Athlete ID: {data.athleteId}</p> */}
          {/* <p>Rank: {data.rank}</p> */}
          {/* Display more data as needed */}
        </div>
      ) : (
        <p>No KOM/QOM data available.</p>
      )}
    </div>
  );
};

export default StravaSegmentKOM;
