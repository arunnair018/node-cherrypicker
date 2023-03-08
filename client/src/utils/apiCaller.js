import Axios from "axios";
import socketIOClient from "socket.io-client";
const SOCKET_ENDPOINT  = "http://localhost:8080"

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


export const getPickerSocket = () => {
    return socketIOClient(SOCKET_ENDPOINT)
}