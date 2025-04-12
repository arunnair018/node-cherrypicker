import React, { useEffect, useState } from "react";
import { getServers } from "./utils/apiMethods";
import PickerForm from "./components/picker-form";

const cherrySvg = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version={1.0}
      width="360.000000pt"
      height="360.000000pt"
      viewBox="0 0 360.000000 360.000000"
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        transform="translate(0.000000,360.000000) scale(0.100000,-0.100000)"
        fill="#000000"
        stroke="none"
      >
        <path
          d="M1515 2991 c-181 -30 -425 -144 -425 -200 0 -31 147 -147 255 -201 164 -81 296 -97 460 -55 127 32 305 140 305 185 0 11 -33 52 -72 92 -77 77 -169 133 -267 162 -66 19 -189 27 -256 17z m210 -96 c73 -19 177 -79 228 -133 l39 -39 -29 -20 c-166 -118 -374 -134 -558 -43 -59 29 -177 112 -183 129 -4 12 151 80 232 101 89 23 194 25 271 5z"
          style={{ fill: "green" }}
        />
        <path
          d="M2163 2659 c-209 -110 -394 -313 -548 -599 -53 -100 -155 -328 -155 -348 0 -6 -37 -10 -87 -10 -154 -1 -289 -60 -394 -172 -103 -110 -149 -228 -149 -383 0 -157 56 -284 175 -396 225 -210 579 -194 784 36 l47 53 24 -25 c38 -40 140 -102 205 -124 135 -44 274 -36 402 25 186 88 303 274 303 481 0 156 -49 275 -159 384 -117 117 -296 178 -446 152 -33 -6 -63 -9 -66 -7 -17 10 -31 179 -26 300 8 196 53 342 163 524 58 94 62 120 24 140 -15 8 -36 1 -97 -31z m-63 -162 c0 -2 -11 -26 -24 -53 -97 -201 -124 -478 -70 -731 4 -23 3 -33 -6 -33 -21 0 -135 -87 -167 -126 l-30 -37 -64 52 c-35 28 -92 66 -126 83 -35 17 -63 34 -63 39 0 14 105 249 140 314 87 162 240 362 336 440 27 22 51 43 52 47 3 8 22 11 22 5z m-429 -1094 c66 -39 80 -143 19 -143 -59 0 -116 110 -78 148 16 16 25 15 59 -5z"
          style={{ fill: "red" }}
        />
      </g>
    </svg>
  );
};

function App() {
  const [serverList, setServerList] = useState([]);

  useEffect(() => {
    (async () => {
      const servers = await getServers();
      setServerList(
        servers
          .map((server) => ({
            label: server,
            value: server,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    })();
  }, []);

  return (
    <div className="main-wrapper">
      <div className="page-header">
        <div className="header-title">CHERRY {cherrySvg()} PICKER</div>
      </div>
      <div className="page-body">
        <PickerForm serverList={serverList} />
      </div>
    </div>
  );
}

export default App;
