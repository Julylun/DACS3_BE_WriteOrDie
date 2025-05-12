import { IntrinsicException } from "@nestjs/common";

export default abstract class WebsocketException extends IntrinsicException {
    abstract readonly event: string;
    abstract readonly statusCode: number;
    abstract readonly statusMessage: string;
    abstract readonly responseData: string | Object;
    constructor(message?: string) {
        super(message)
    }
}