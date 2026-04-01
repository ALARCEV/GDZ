import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiError, badRequest } from "@/server/errors/api-error";

export type RouteContext = {
  params: Promise<Record<string, string>>;
};

export function jsonOk<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function jsonCreated<T>(body: T) {
  return jsonOk(body, 201);
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export async function requireRouteParam(
  context: RouteContext,
  name: string
) {
  const params = await context.params;
  const value = params?.[name];

  if (!value) {
    throw badRequest(`Missing route param \`${name}\`.`);
  }

  return value;
}

export function parseOptionalDateQueryParam(value: string | null, fieldName: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`Query parameter \`${fieldName}\` must be a valid ISO date.`);
  }

  return parsed;
}

export function withRouteErrorHandling(
  handler: (request: NextRequest, context: RouteContext) => Promise<Response> | Response
) {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              details: error.details ?? null
            }
          },
          { status: error.status }
        );
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "validation_error",
              message: "Request validation failed.",
              details: error.flatten()
            }
          },
          { status: 400 }
        );
      }

      console.error("Unhandled route error", error);

      return NextResponse.json(
        {
          error: {
            code: "internal_error",
            message: "Unexpected server error."
          }
        },
        { status: 500 }
      );
    }
  };
}
