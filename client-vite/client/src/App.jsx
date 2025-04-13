import React, { useEffect, useState } from "react";
import { getServers } from "./utils/apiMethods";
import PickerForm from "./components/picker-form";
import { cherrySvg, settingsSvg } from "./utils/svgIcons";
import { Drawer, Form, Button } from "antd";
import SettingsForm from "./components/settings-form";
import { CallToast } from "./components/toast";

function App() {
  const [serverList, setServerList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const validateForm = () => {
    const {
      GIT_BASE_DIRECTORY,
      GITHUB_ACCESS_TOKEN,
      REPO_OWNER,
      REPO,
      BASE_BRANCH,
      SERVER_BRANCHES,
    } = form.getFieldsValue();
    if (
      !GIT_BASE_DIRECTORY ||
      !GITHUB_ACCESS_TOKEN ||
      !REPO_OWNER ||
      !REPO ||
      !BASE_BRANCH ||
      !SERVER_BRANCHES
    ) {
      CallToast("error", {
        message: "Error!",
        description: "Please fill in all details correctly",
      });
      return;
    }
    const payload = {
      GIT_BASE_DIRECTORY,
      GITHUB_ACCESS_TOKEN,
      REPO_OWNER,
      REPO,
      BASE_BRANCH,
      SERVER_BRANCHES,
    };
    console.log("Settings Payload: ", payload);
  };
  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

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

  validateForm;

  return (
    <div className="main-wrapper">
      <div className="page-header">
        <div className="header-title">CHERRY {cherrySvg()} PICKER</div>
        <div className="settings-icon" onClick={showDrawer}>
          {settingsSvg()}
        </div>
      </div>
      <div className="page-body">
        <PickerForm serverList={serverList} />
      </div>
      <Drawer
        title="Settings"
        onClose={onClose}
        open={open}
        width={600}
      >
        <SettingsForm form={form} />
      </Drawer>
    </div>
  );
}

export default App;
