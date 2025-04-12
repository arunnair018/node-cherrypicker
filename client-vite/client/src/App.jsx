import React, { useEffect, useState } from "react";
import { getServers } from "./utils/apiMethods";
import PickerForm from "./components/picker-form";

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
        <div className="header-title"> CHERRY PICKER</div>
      </div>
      <div className="page-body">
        <PickerForm serverList={serverList} />
      </div>
    </div>
  );
}

export default App;
