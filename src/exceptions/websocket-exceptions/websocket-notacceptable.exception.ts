import WebsocketException from "./abstract/websocket.exception";

export default class WebsocketInternalServerErrorException extends WebsocketException {
    responseData: string | Object;
    readonly event: string;
    readonly statusCode: number;
    readonly statusMessage: string;
    constructor(message: string | 'Not Acceptable', event: string) {
        super(message);

        this.statusMessage = message;
        this.event = (event) ? event : 'error';
        this.statusCode = 406;
    }
}