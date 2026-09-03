export type SmsRequest = { to: string; body: string };
export type SmsSendOutcome = { status: "sent" | "failed" | "simulated"; detail?: string };
export type SmsTransport = {
  name: string;
  send(request: SmsRequest): Promise<SmsSendOutcome>;
};
