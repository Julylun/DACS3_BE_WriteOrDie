// import { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from "express";
import ResponseData from "src/common/response.dto";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        const message = typeof exceptionResponse === 'string' ? exceptionResponse : exceptionResponse.message;

        let responseData = ResponseData.get({
                statusCode: status,
                statusMessage: message || 'Internal Server Error',
                data: exceptionResponse
            })

        this.logger.error(`Caught an Htpp exception with informations: `, responseData);
        response.status(status).json(responseData)
    }
}
