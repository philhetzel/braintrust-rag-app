import { registerOTel } from "@vercel/otel";

registerOTel({
  serviceName: 'PhilScratchArea'
});