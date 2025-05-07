import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from "express";
import { Socket } from 'socket.io';
import ResponseData from "src/common/response.dto";
import WebsocketException from 'src/exceptions/websocket-exceptions/abstract/websocket.exception';

@Catch(WebsocketException)
export class WebsocketFilterException implements ExceptionFilter {
    private readonly logger = new Logger(WebsocketFilterException.name);

    catch(exception: WebsocketException, host: ArgumentsHost) {
        const client: Socket = host.switchToWs().getClient();

        const statusCoode = exception.statusCode;
        const statusMessage = exception.statusMessage
        const exceptionResponse = exception.responseData;
        const data = typeof exceptionResponse === 'string' ? exceptionResponse : exceptionResponse.toString();

        let responseData = ResponseData.get({
            statusCode: statusCoode,
            statusMessage: statusMessage,
            data: {
                message: exception.message,
                response: exception.responseData
            }
        })

        client.emit(exception.event, ResponseData)
        this.logger.error(`Caught an Websocket exception with informations: `, responseData);
    }
}
