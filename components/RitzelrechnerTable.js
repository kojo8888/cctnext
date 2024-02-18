export default function RitzelrechnerTable({
  ritzelArray,
  ühValues,
  ükValues,
  VhValues,
  VkValues,
  DevhValues,
  DevkValues,
  ShValues,
  SkValues,
}) {
  return (
    <div>
      <table className="table-auto">
        <thead>
          <tr>
            <th>Ritzel</th>
            {ritzelArray.map((ritzel, index) => (
              <th key={index}>{ritzel}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Übersetzung groß</td>
            {ühValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Übersetzung klein</td>
            {ükValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>

          <tr>
            <td>Geschwindigkeit groß</td>
            {VhValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Geschwindigkeit klein</td>
            {VkValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Entwicklung groß</td>
            {DevhValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Entwicklung klein</td>
            {DevkValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Strecke groß</td>
            {ShValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td>Strecke klein</td>
            {SkValues.map((value, index) => (
              <td key={index}>{value.toFixed(2)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
