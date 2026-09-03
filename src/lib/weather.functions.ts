import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchForecast } from "./open-meteo.server";

export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ latitude: z.number(), longitude: z.number() }).parse(data),
  )
  .handler(async ({ data }) => {
    return fetchForecast(data.latitude, data.longitude);
  });