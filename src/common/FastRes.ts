import { Response } from "express";
import ResponseData from "./response.dto";
import { Socket } from "socket.io";

export default class FastRes {
    constructor() {}

    static sendHttp(response: Response, data: ResponseData) {
        response.status(data.statusCode)
        response.statusMessage = data.statusMessage
        response.send(data);
    }

    static sendSocketIo(event: string, responseData: ResponseData, client: Socket) { 
        client.emit(event, responseData)
    }
}