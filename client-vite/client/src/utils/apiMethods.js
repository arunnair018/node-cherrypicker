import Axios from "axios";
import socketIOClient from "socket.io-client";

const SOCKET_ENDPOINT = "http://localhost:8080";
const SOCKET_ACTIONS = {
  PICK_START: "pick_start",
  PICK_PROGRESS: "pick_progress",
  PICK_COMPLETE: "pick_complete",
  COMPLETE: "complete",
  ERROR: "error",
};

export const getServers = async () => {
  try {
    const options = {
      method: "get",
      url: "api/v1/get-branches",
    };
    const resp = await Axios(options);
    if (resp.status === 200) {
      return resp.data;
    }
  } catch {
    console.error("Something went wrong while fetching servers!!");
  }
};

const getPickerSocket = () => {
  return socketIOClient(SOCKET_ENDPOINT);
};

export const startPicker = async (formData, callBack = () => {}) => {
  const socket = await getPickerSocket();
  // server connection
  socket.on("acceptence", () => {
    console.log("connection accepted!!");
    socket.emit("start", JSON.stringify(formData));
  });

  // each PICK
  socket.on(SOCKET_ACTIONS.PICK_START, (data) => {
    console.log("pick started!!", data);
    callBack({ env: data });
  });

  // TRack progress
  socket.on(SOCKET_ACTIONS.PICK_PROGRESS, (data) => {
    console.log("pick progress!!", JSON.parse(data));
  });

  // pick complete
  socket.on(SOCKET_ACTIONS.PICK_COMPLETE, (data) => {
    const [env, url] = data.split("|");
    console.log("pick complete!!", env, url);
    callBack({ env, url });
  });

  // cherry-pick complete
  socket.on(SOCKET_ACTIONS.COMPLETE, () => {
    socket.disconnect();
  });
  socket.on(SOCKET_ACTIONS.ERROR, (error) => {
    console.log("error!!", error);
    socket.disconnect();
    callBack({ error });
  });
};
