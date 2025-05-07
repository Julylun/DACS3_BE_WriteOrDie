
export default abstract class WebsocketException extends Error {
    abstract readonly event: string;
    abstract readonly statusCode: number;
    abstract readonly statusMessage: string;
    abstract readonly responseData: string | Object;
    constructor(message?: string) {
        super(message)
    }
}