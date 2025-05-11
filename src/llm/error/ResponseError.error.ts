import { IntrinsicException } from "@nestjs/common";

export default class ResponseError extends IntrinsicException{
    constructor(message?: string) {
        super(message)
    }
}