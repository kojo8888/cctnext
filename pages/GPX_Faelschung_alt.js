export default function Home() {
  const modifyGpxFile = async () => {
    const response = await fetch("/api/modifyGPX");
    if (!response.ok) {
      console.error("Failed to modify GPX file");
      return;
    }
    const modifiedGpx = await response.text();

    // You can download the file or display it on the page
    console.log(modifiedGpx);
  };

  return (
    <div>
      <button onClick={modifyGpxFile}>Modify GPX File</button>
    </div>
  );
}
