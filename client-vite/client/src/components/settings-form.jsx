import React from "react";
import { Button, Form, Input } from "antd";

const SettingsForm = ({ form }) => {
  const saveSettings = () => {
    console.log("form: ", form.getFieldsValue());
  };
  return (
    <>
      <div className="settings-form-wrapper">
        <Form form={form} layout="vertical">
          <Form.Item label="GIT_BASE_DIRECTORY" name="GIT_BASE_DIRECTORY">
            <Input placeholder="<git repo path (repo not included)>" />
          </Form.Item>
          <Form.Item label="GITHUB_ACCESS_TOKEN" name="GITHUB_ACCESS_TOKEN">
            <Input placeholder="<git personal access token>" />
          </Form.Item>
          <Form.Item label="REPO_OWNER" name="REPO_OWNER">
            <Input placeholder="<repo owner>" />
          </Form.Item>
          <Form.Item label="REPO" name="REPO">
            <Input placeholder="<repo>" />
          </Form.Item>
          <Form.Item label="BASE_BRANCH" name="BASE_BRANCH">
            <Input placeholder="<main branch of repo>" />
          </Form.Item>
          <Form.Item label="SERVER_BRANCHES" name="SERVER_BRANCHES">
            <Input placeholder="<comma seperated branches>" />
          </Form.Item>
          <Button type="primary" onClick={saveSettings}>
            Save
          </Button>
        </Form>
      </div>
    </>
  );
};

export default SettingsForm;
