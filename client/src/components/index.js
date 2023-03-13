import React, { useEffect, useState } from "react";
import { Layout, theme } from "antd";
import PickerForm from "./pickerForm";
import { getServers } from "../utils/apiCaller";
import PickerDetails from "./pickerDetails";
const { Header, Content, Footer } = Layout;

const PickerBaseComponent = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const [serverList, setServerList] = useState([]);
  const [formData, setFormData] = useState(false);

  useEffect(() => {
    (async () => {
      const servers = await getServers();
      setServerList(
        servers.map((server) => ({
          label: server,
          value: server,
        }))
      );
    })();
  }, []);

  return (
    <Layout className="layout">
      <Header>
        <div className="header-title"> CHERRY PICKER</div>
      </Header>
      <Content style={{ padding: "0 50px" }}>
        <div
          className="site-layout-content"
          style={{ background: colorBgContainer }}
        >
          <div className="content-container">
            <div className="picker-form-wrapper">
              <PickerForm serverList={serverList} setFormData={setFormData} />
            </div>
            <div className="picker-detail-wrapper">
              <PickerDetails formData={formData} setFormData={setFormData} />
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default PickerBaseComponent;
