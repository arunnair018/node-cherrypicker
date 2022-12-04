
import mongoose from "mongoose";

const Logs = mongoose.model('Logs');

export const list_records = async (query) => {
  try {
    const logs = await Logs.find(query).exec();
    return logs;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const create_record = async (data) => {
  try {
    const new_log = new Logs(data)
    const log = await new_log.save()
    return log;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export const show_record = async (query) => {
  try {
    const logs = await Logs.findOne(query).exec();
    return logs;
  } catch (error) {
    console.error(error);
    return false;
  }
}