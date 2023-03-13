import React, { useEffect, useRef, useState } from "react";
import { getPickerSocket } from "../utils/apiCaller";
import { Card, Alert, Button } from "antd";

const SOCKET_ACTIONS = {
  PICK_START: "pick_start",
  PICK_PROGRESS: "pick_progress",
  PICK_COMPLETE: "pick_complete",
  COMPLETE: "complete",
  ERROR: "error",
};

const PickerDetails = ({ formData, setFormData }) => {
  const [picks, setPicks] = useState([]);
  const [error, setError] = useState("");
  const currentProgress = useRef();
  const [currentEnv, setcurrentEnv] = useState("");

  const startPicker = async () => {
    const socket = await getPickerSocket();
    // server connection
    socket.on("acceptence", () => {
      console.log("connection accepted!!");
      socket.emit("start", JSON.stringify(formData));
    });

    // each PICK
    socket.on(SOCKET_ACTIONS.PICK_START, (data) => {
      currentProgress.current = [];
      setcurrentEnv(data);
    });

    // TRack progress
    socket.on(SOCKET_ACTIONS.PICK_PROGRESS, (data) => {
      const payload = JSON.parse(data);
      currentProgress.current.push(payload);
    });

    // pick complete
    socket.on(SOCKET_ACTIONS.PICK_COMPLETE, (data) => {
      const [env, url] = data.split("|");
      setPicks([
        {
          env,
          messages: currentProgress.current,
          url,
          timestamp: new Date().toLocaleString(),
        },
        ...picks,
      ]);
      currentProgress.current = [];
      setcurrentEnv("");
    });

    // cherry-pick complete
    socket.on(SOCKET_ACTIONS.COMPLETE, () => {
      socket.disconnect();
      setFormData(false);
    });
    socket.on(SOCKET_ACTIONS.ERROR, (error) => {
      currentProgress.current = [];
      setcurrentEnv("");
      setError(error);
    });
  };

  useEffect(() => {
    if (!!formData) {
      currentProgress.current = [];
      setcurrentEnv("");
      startPicker();
    }
  }, [formData]);

  return (
    <div className="pick-wrapper">
      {!!error && (
        <div>
          <Alert message={error} type="error" />
        </div>
      )}
      {!!currentEnv && (
        <div className="pick-in-progress">
          <Card title={currentEnv} style={{ width: "100%" }}>
            <div className="loading-clock">
              <div className="wrapper">
                <div className="clock"></div>
                <div className="clock"></div>
              </div>
            </div>
          </Card>
        </div>
      )}
      {!!picks?.length &&
        picks.map((item, index) => {
          console.log(item);
          return (
            <div className="pick-completed" key={index}>
              <Card
                title={
                  <div>
                    <span>{item.env}</span>
                    <span className="timestamp">( {item.timestamp} )</span>
                  </div>
                }
                style={{ width: "100%" }}
                extra={
                  !!item.url ? (
                    <div>
                      <Button
                        children={"copy"}
                        type={"link"}
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                        }}
                      />
                      <Button
                        children={"view"}
                        type={"primary"}
                        onClick={() => {
                          window.open(item.url, "_blank");
                        }}
                      />
                    </div>
                  ) : (
                    <></>
                  )
                }
              >
                <div>
                  {!!item?.messages.length &&
                    item?.messages?.map(
                      ({ success, message, commits = null }, index) => {
                        return (
                          <>
                            <p key={index}>
                              <span>{!!success ? "✅" : "❌"}</span>&nbsp;
                              {message}
                            </p>
                            {!!commits && (
                              <ul>
                                {commits.map((item, index) => {
                                  return (
                                    <li
                                      key={index}
                                      className={`${
                                        !!item.success
                                          ? "text-green"
                                          : "text-red"
                                      }`}
                                    >{`${item.commit.slice(0, 5)} : ${
                                      item.message
                                    }`}</li>
                                  );
                                })}
                              </ul>
                            )}
                          </>
                        );
                      }
                    )}
                </div>
              </Card>
            </div>
          );
        })}
    </div>
  );
};

export default PickerDetails;
