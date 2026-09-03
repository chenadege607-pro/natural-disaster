ALTER TABLE public.localities
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS elevation_m integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slope_index numeric NOT NULL DEFAULT 0.3;

ALTER TABLE public.locality_forecasts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS river_discharge numeric,
  ADD COLUMN IF NOT EXISTS rainfall_mm_72h numeric;

UPDATE public.localities AS l SET latitude = v.lat, longitude = v.lon, elevation_m = v.elev, slope_index = v.slope
FROM (VALUES
  ('banyo-slopes', 6.7500, 11.8167, 1100, 0.75),
  ('meiganga-centre', 6.5167, 14.2917, 1030, 0.35),
  ('ngaoundere-baladji', 7.3167, 13.5833, 1120, 0.45),
  ('tibati-lake', 6.4667, 12.6333, 840, 0.20),
  ('mbalmayo-centre', 3.5167, 11.5000, 640, 0.25),
  ('obala-centre', 4.1667, 11.5333, 620, 0.30),
  ('yaounde-mokolo', 3.8760, 11.5100, 730, 0.55),
  ('yaounde-nkolbisson', 3.8700, 11.4400, 700, 0.60),
  ('abong-mbang-centre', 3.9833, 13.1833, 690, 0.25),
  ('batouri-centre', 4.4333, 14.3667, 650, 0.30),
  ('bertoua-nkolbikon', 4.5833, 13.6833, 660, 0.35),
  ('yokadouma-centre', 3.5167, 15.0500, 640, 0.20),
  ('kousseri-madagascar', 12.0800, 15.0300, 295, 0.05),
  ('maroua-domayo', 10.5900, 14.3100, 400, 0.15),
  ('mokolo-mandara', 10.7400, 13.8000, 800, 0.80),
  ('yagoua-centre', 10.3400, 15.2400, 320, 0.05),
  ('douala-bonaberi', 4.0800, 9.6700, 12, 0.05),
  ('douala-makepe', 4.0700, 9.7500, 18, 0.08),
  ('edea-centre', 3.8000, 10.1333, 40, 0.15),
  ('nkongsamba-slopes', 4.9500, 9.9333, 830, 0.70),
  ('garoua-poumpoumre', 9.3000, 13.4000, 190, 0.10),
  ('guider-hills', 9.9333, 13.9500, 380, 0.55),
  ('lagdo-village', 9.0500, 13.7333, 210, 0.25),
  ('pitoa-centre', 9.3833, 13.5000, 200, 0.15),
  ('bamenda-mulang', 5.9500, 10.1500, 1240, 0.50),
  ('bamenda-ntarinkon', 5.9700, 10.1400, 1320, 0.72),
  ('ndop-plain', 6.0000, 10.4500, 1150, 0.10),
  ('wum-centre', 6.3833, 10.0667, 1200, 0.45),
  ('campo-coast', 2.3667, 9.8167, 10, 0.10),
  ('ebolowa-centre', 2.9000, 11.1500, 600, 0.25),
  ('kribi-mboamanga', 2.9400, 9.9100, 15, 0.10),
  ('sangmelima-centre', 2.9333, 11.9833, 680, 0.25),
  ('buea-bokwango', 4.1500, 9.2400, 1000, 0.78),
  ('kumba-fiango', 4.6333, 9.4500, 230, 0.25),
  ('limbe-mile4', 4.0300, 9.2100, 40, 0.35),
  ('mundemba-centre', 4.9500, 8.8667, 90, 0.20),
  ('bafoussam-tamdja', 5.4700, 10.4200, 1420, 0.55),
  ('dschang-foreke', 5.4300, 10.0400, 1400, 0.68),
  ('foumban-centre', 5.7167, 10.9000, 1210, 0.35),
  ('mbouda-centre', 5.6333, 10.2500, 1420, 0.40)
) AS v(slug, lat, lon, elev, slope)
WHERE l.slug = v.slug;