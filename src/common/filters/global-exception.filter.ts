import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { StandardResponseDto } from '../dto/response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // Mapping of Prisma error codes to user-friendly messages
  private readonly prismaErrorMessages: Record<string, string> = {
    P2000: 'Value is too long for the field.',
    P2001: 'The record searched for does not exist.',
    P2002: 'A record with this information already exists.',
    P2003: 'Related record not found.',
    P2004: 'Constraint violation in the database.',
    P2005: 'Invalid value provided for the field.',
    P2006: 'Invalid field value for the database type.',
    P2007: 'Data validation error.',
    P2010: 'Raw query failed.',
    P2011: 'Required field cannot be null.',
    P2012: 'Required field is missing.',
    P2013: 'Required argument is missing.',
    P2014: 'Invalid ID format provided.',
    P2015: 'Related record not found.',
    P2016: 'Invalid query structure.',
    P2017: 'Relation constraint violation.',
    P2018: 'Connected records not found.',
    P2019: 'Invalid input data.',
    P2020: 'Value out of valid range.',
    P2021: 'Database table not found - please contact support.',
    P2022: 'Database column not found - please contact support.',
    P2023: 'Data type mismatch.',
    P2024: 'Database connection error - please try again later.',
    P2025: 'The requested record could not be found.',
    P2026: 'Database feature not supported - please contact support.',
    P2027: 'Multiple validation errors occurred.',
    P2030: 'Search index not found - please contact support.',
    P2031: 'Invalid MongoDB query format.',
    P2033: 'Number overflow - value is too large.',
    P2034: 'Transaction failed - please try again.',
    P2037: 'Database connection limit reached - please try again later.',
  };

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again later.';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        error = responseObj.error;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      const prismaError = exception as Prisma.PrismaClientKnownRequestError;
      error = `Prisma Error: ${prismaError.code}`;

      switch (prismaError.code) {
        case 'P2002':
          const field = prismaError.meta?.target?.[0] || 'field';
          message = `A record with this ${field} already exists.`;
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2003':
          if (prismaError.meta?.field_name === 'clientId') {
            message = 'Invalid client ID - client does not exist.';
          } else if (prismaError.meta?.field_name === 'storeId') {
            message = 'Invalid store ID - store does not exist.';
          } else if (prismaError.meta?.field_name === 'categoryId') {
            message = 'Invalid category ID - category does not exist.';
          } else {
            message = 'Invalid reference - related record not found.';
          }
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2025':
          message = 'The requested record could not be found.';
          status = HttpStatus.NOT_FOUND;
          break;

        case 'P2011':
          const nullField = prismaError.meta?.field_name || 'field';
          message = `Required field '${nullField}' cannot be null.`;
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2012':
          const missingField = prismaError.meta?.field_name || 'field';
          message = `Required field '${missingField}' is missing.`;
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2013':
          const missingArg = prismaError.meta?.argument_name || 'argument';
          message = `Required argument '${missingArg}' is missing.`;
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2014':
          message = 'Invalid ID format provided.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2015':
          message = 'Related record not found - please check your references.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2016':
          message = 'Invalid query structure - please check your request format.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2017':
          message = 'Relation constraint violation - please check related records.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2018':
          message = 'Connected records not found - please check your references.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2019':
          message = 'Invalid input data - please check your request format.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2020':
          message = 'Value out of valid range - please check your input values.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2021':
        case 'P2022':
        case 'P2024':
        case 'P2026':
        case 'P2034':
        case 'P2037':
          message = this.prismaErrorMessages[prismaError.code];
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;

        case 'P2023':
          message = 'Data type mismatch - please check your input values.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2030':
          message = 'Search index not found - please contact support.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2031':
          message = 'Invalid MongoDB query format.';
          status = HttpStatus.BAD_REQUEST;
          break;

        case 'P2033':
          message = 'Number overflow - value is too large.';
          status = HttpStatus.BAD_REQUEST;
          break;

        default:
          message = this.prismaErrorMessages[prismaError.code] || 'An error occurred while processing your request.';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      // Handle unknown Prisma errors
      message = 'An unexpected database error occurred.';
      error = 'Prisma Unknown Error';
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    } else if (exception instanceof Error) {
      // Handle other generic errors
      message = 'An unexpected error occurred.';
      error = exception.name;
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    const errorResponse: StandardResponseDto<null> = {
      success: false,
      message,
      data: null,
      status,
      timestamp: new Date().toISOString(),
      ...(error && { error }),
    };

    // Log the error for debugging
    console.error('Exception caught:', {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      message,
      error: exception,
    });

    response.status(status).json(errorResponse);
  }
}