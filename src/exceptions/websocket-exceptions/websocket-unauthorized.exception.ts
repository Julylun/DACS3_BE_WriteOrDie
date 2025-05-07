import WebsocketException from "./abstract/websocket.exception";

export default class WebsocketUnauthorizedEuxepction extends WebsocketException {
    responseData: string | Object;
    readonly event: string;
    readonly statusCode: number;
    readonly statusMessage: string;
    constructor(message: string | 'Unauthorized', event?: string) {
        super(message);

        this.statusMessage= message;
        this.event = (event) ? event : 'error';
        this.statusCode = 401;
    }
}