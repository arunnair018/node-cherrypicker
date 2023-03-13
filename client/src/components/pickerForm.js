import React, { useState } from "react";
import { Button, Form, Input, Checkbox, Alert } from "antd";

const PickerForm = ({ serverList, setFormData }) => {
  const [form] = Form.useForm();
  const [servers, setServers] = useState([]);
  const [error, setError] = useState(false);

  const validateForm = () => {
    setError(false);
    const { prids, envs = [], approval, snapshot } = form.getFieldsValue();
    if (!!snapshot) {
      envs.push(snapshot.trim());
    }
    if (!prids || !envs.length) {
      setError(true);
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
      ...(!!approval && { approval: approval.trim() }),
    };
    setFormData(payload);
    setServers([]);
    form.resetFields();
  };

  return (
    <div>
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

        <Form.Item label="QA approval link" name="approval">
          <Input placeholder="please enter slack link for approval" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={validateForm}>
            Pick
          </Button>
        </Form.Item>
      </Form>
      {!!error && (
        <Alert
          message={
            <div>Are you sure details are correct to start a pick!!</div>
          }
          type="error"
        />
      )}
    </div>
  );
};

export default PickerForm;
