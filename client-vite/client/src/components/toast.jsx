import { notification } from "antd";

export const CallToast = (type, options) => {
  const toastOptions = { ...options };
  notification[type](toastOptions);
};
