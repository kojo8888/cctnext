import React from "react";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";

const StravaElapsedTime = () => {
  const { data, error } = useSWR("/api/stravafetch", fetcher);
  const time = data?.movingTime; // convert from seconds to hours
  return <div>{time}</div>;
};

export default StravaElapsedTime;
