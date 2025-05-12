import { IsDataURI } from "class-validator";

export interface ResponseDataInterface {
    statusCode: number;
    statusMessage: string;
    errors?: any[]
    data?: any
}

export default class ResponseData {
    public statusCode: number;
    public statusMessage: string;
    public errors?: any[];
    public data?: any;
    constructor({statusCode, statusMessage, errors, data}: ResponseDataInterface) {
        this.statusCode = (statusCode) ? statusCode : 500;
        this.statusMessage = (statusMessage) ? statusMessage : 'Internal Server Error';
        this.data = (data) ? data : undefined;
        this.errors = (errors) ? errors : undefined;
    }

    static get = ({statusCode, statusMessage, errors, data}: ResponseDataInterface): ResponseData => {
        return new ResponseData({statusCode, statusMessage, errors, data})
    }
}   