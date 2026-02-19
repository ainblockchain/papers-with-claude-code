// Next.js App Router adapter for x402 payment gating
// Wraps @x402/core server components for use with Next.js route handlers

import { NextRequest, NextResponse } from 'next/server';
import {
  x402ResourceServer,
  x402HTTPResourceServer,
} from '@x402/core/server';

// Payment requirement configuration for a route
export interface X402RouteConfig {
  price: string; // e.g. "0.001"
  network: string; // e.g. "eip155:2368"
  description: string;
  resource: string;
  payTo: string; // merchant wallet address
}

// Next.js adapter implementing the x402 HTTPAdapter interface
class NextJsAdapter {
  private req: NextRequest;
  private bodyText: string;

  constructor(req: NextRequest, bodyText: string) {
    this.req = req;
    this.bodyText = bodyText;
  }

  getHeader(name: string): string | undefined {
    return this.req.headers.get(name) ?? undefined;
  }

  getMethod(): string {
    return this.req.method;
  }

  getPath(): string {
    return new URL(this.req.url).pathname;
  }

  getUrl(): string {
    return this.req.url;
  }

  getAcceptHeader(): string {
    return this.req.headers.get('accept') || '';
  }

  getUserAgent(): string {
    return this.req.headers.get('user-agent') || '';
  }

  getQueryParams(): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};
    new URL(this.req.url).searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  getQueryParam(name: string): string | string[] | undefined {
    return new URL(this.req.url).searchParams.get(name) ?? undefined;
  }

  getBody(): unknown {
    try {
      return JSON.parse(this.bodyText);
    } catch {
      return undefined;
    }
  }
}

/**
 * Wraps a Next.js route handler with x402 payment verification.
 *
 * If the request does not include a valid payment header, returns 402.
 * If payment is verified and settled, calls the handler.
 */
export async function withX402Payment(
  req: NextRequest,
  routeConfig: X402RouteConfig,
  handler: (req: NextRequest, bodyText: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const bodyText = await req.text().catch(() => '');

  // Build route configuration for x402
  const routeKey = `${req.method} ${new URL(req.url).pathname}`;
  const routes = {
    [routeKey]: {
      accepts: {
        scheme: 'exact' as const,
        payTo: routeConfig.payTo,
        price: routeConfig.price,
        network: routeConfig.network,
        maxTimeoutSeconds: 60,
        extra: {},
      },
      resource: routeConfig.resource,
      description: routeConfig.description,
    },
  };

  // Create x402 server instances
  const resourceServer = new x402ResourceServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpServer = new x402HTTPResourceServer(resourceServer, routes as any);

  // Initialize facilitator connection
  try {
    await httpServer.initialize();
  } catch {
    // Facilitator may not be available — continue anyway for payment requirement generation
  }

  // Build adapter and context
  const adapter = new NextJsAdapter(req, bodyText);
  const context = {
    adapter,
    path: new URL(req.url).pathname,
    method: req.method,
    paymentHeader:
      adapter.getHeader('payment-signature') ||
      adapter.getHeader('x-payment'),
  };

  // Check if payment is required
  if (!httpServer.requiresPayment(context)) {
    return handler(req, bodyText);
  }

  // Process the HTTP request through x402
  const result = await httpServer.processHTTPRequest(context);

  switch (result.type) {
    case 'no-payment-required':
      return handler(req, bodyText);

    case 'payment-error': {
      const { response } = result;
      const headers: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        headers[key] = String(value);
      });

      if (response.isHtml) {
        return new NextResponse(response.body as string, {
          status: response.status,
          headers: { ...headers, 'content-type': 'text/html' },
        });
      }

      return NextResponse.json(response.body || {}, {
        status: response.status,
        headers,
      });
    }

    case 'payment-verified': {
      const { paymentPayload, paymentRequirements, declaredExtensions } = result;

      // Execute the handler first
      const handlerResponse = await handler(req, bodyText);

      // If handler returned an error, don't settle
      if (handlerResponse.status >= 400) {
        return handlerResponse;
      }

      // Settle the payment
      try {
        const settleResult = await httpServer.processSettlement(
          paymentPayload,
          paymentRequirements,
          declaredExtensions
        );

        if (!settleResult.success) {
          return NextResponse.json(
            {
              error: 'settlement_failed',
              message: `Settlement failed: ${settleResult.errorReason}`,
            },
            { status: 500 }
          );
        }

        // Add settlement headers to the handler response
        const responseHeaders = new Headers(handlerResponse.headers);
        Object.entries(settleResult.headers).forEach(([key, value]) => {
          responseHeaders.set(key, String(value));
        });

        // Clone response with settlement headers
        const body = await handlerResponse.text();
        return new NextResponse(body, {
          status: handlerResponse.status,
          headers: responseHeaders,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: 'settlement_failed',
            message:
              error instanceof Error ? error.message : 'Unknown settlement error',
          },
          { status: 500 }
        );
      }
    }

    default:
      return NextResponse.json(
        { error: 'payment_required', message: 'Payment processing failed' },
        { status: 402 }
      );
  }
}

/**
 * Helper to build the default route config from environment variables.
 */
export function buildRouteConfig(overrides?: Partial<X402RouteConfig>): X402RouteConfig {
  const chainId = process.env.NEXT_PUBLIC_KITE_CHAIN_ID || '2368';
  return {
    price: '0.001',
    network: `eip155:${chainId}`,
    description: 'Unlock learning stage',
    resource: '/api/x402/unlock-stage',
    payTo: process.env.KITE_MERCHANT_WALLET || '',
    ...overrides,
  };
}
