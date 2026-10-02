import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import App from "./App.jsx";
import "./css/styles.css";

const useDark = () => {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = (e) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
};

const Root = () => {
  const dark = useDark();
  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: dark ? "#7c5cff" : "#6d5dfc",
          borderRadius: 8,
          fontFamily: "inherit",
          colorBgContainer: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
          colorBorder: dark ? "rgba(120,134,255,0.3)" : "rgba(109,93,252,0.22)",
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
