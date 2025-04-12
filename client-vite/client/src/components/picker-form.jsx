import React, { useState } from "react";
import { Button, Form, Input, Checkbox, notification, Spin } from "antd";
import { startPicker } from "../utils/apiMethods";

const PickerForm = ({ serverList }) => {
  const [form] = Form.useForm();
  const [servers, setServers] = useState([]);
  const [api, contextHolder] = notification.useNotification();
  const [prsMade, setPrsMade] = useState({});

  const openNotification = (description = "Something went wrong!") => {
    api.error({
      message: `Error!`,
      description,
    });
  };

  const pickerCallback = ({ env, url, error }) => {
    if (error) {
      openNotification(error);
    } else {
      setPrsMade((prev) => ({
        ...prev,
        [env]: url || "loading",
      }));
    }
  };

  const validateForm = () => {
    const { prids, envs = [], snapshot } = form.getFieldsValue();
    if (snapshot) {
      envs.push(snapshot.trim());
    }
    if (!prids || !envs.length) {
      openNotification("Please fill in all details correctly");
      return;
    }
    const payload = {
      pr_ids:
        prids
          .trim()
          .split(",")
          .map((i) => i.trim())
          .filter((i) => !!i) || [],
      envs: envs,
    };
    setPrsMade(() => ({}));
    startPicker(payload, pickerCallback);
    setServers([]);
    form.resetFields();
  };

  return (
    <>
      <div className="form-wrapper">
        {contextHolder}
        <Form form={form} layout="vertical">
          <Form.Item label="PR IDS" name="prids">
            <Input placeholder="please enter comma seperated pr id's" />
          </Form.Item>

          <Form.Item label="Select servers" name="envs">
            <Checkbox.Group
              options={serverList}
              value={servers}
              onChange={(value) => {
                setServers(value);
              }}
            />
          </Form.Item>

          <Form.Item label="Snapshot" name="snapshot">
            <Input placeholder="please enter snapshot branch name" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={validateForm}>
              Pick
            </Button>
          </Form.Item>
        </Form>
      </div>
      <div className="pick-detail-wrapper">
        {Object.keys(prsMade).map((item, index) => {
          return (
            <div className="pick-completed" key={index}>
              <div className="pick-completed-wrapper">
                <div className="branch-name">{item}</div>
                <div className="pick-status">
                  {prsMade[item] === "false" ? (
                    <span className="pick-failed">Failed!</span>
                  ) : prsMade[item] === "loading" ? (
                    <Spin />
                  ) : (
                    <Button
                      type="link"
                      onClick={() => {
                        navigator.clipboard.writeText(prsMade[item]);
                      }}
                    >
                      copy
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PickerForm;
