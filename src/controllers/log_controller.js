"use strict"

import { cherry_pick } from "../core_services.js/cherrypicker.js"
import { create_record, list_records } from "../db/services/logs_service.js"

export const create_log = async(req,res) => {
    const picker_resp = await cherry_pick(req.body)
    // const db_resp = await create_record(picker_resp)
    res.status(200).json(picker_resp)
}

export const list_logs = async(req,res) => {
    const db_resp = await list_records({})
    res.status(200).json(db_resp)
}
