"use strict";

import mongoose from "mongoose";

const logSchema = mongoose.Schema({
  origin_prs: {
    type: [String],
    required: true,
  },

  picked_prs: {
    type: [String],
    required: true,
  },

  error_log: {
    type: String,
    trim: true,
  },
});

// model the schema
export const Logs = mongoose.model("Logs", logSchema);
