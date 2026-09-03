CREATE TABLE public.regions (
  slug text PRIMARY KEY,
  name text NOT NULL,
  capital text NOT NULL,
  population integer NOT NULL,
  area_km2 integer NOT NULL,
  terrain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regions TO anon;
GRANT SELECT ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Regions are public" ON public.regions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.region_risk (
  region_slug text PRIMARY KEY REFERENCES public.regions(slug) ON DELETE CASCADE,
  flood_level text NOT NULL,
  landslide_level text NOT NULL,
  rainfall_mm_7d numeric NOT NULL,
  soil_saturation_pct numeric NOT NULL,
  river_level_m numeric NOT NULL,
  forecast_summary text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.region_risk TO anon;
GRANT SELECT ON public.region_risk TO authenticated;
GRANT ALL ON public.region_risk TO service_role;
ALTER TABLE public.region_risk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Region risk is public" ON public.region_risk FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text NOT NULL REFERENCES public.regions(slug) ON DELETE CASCADE,
  hazard text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.alerts TO anon;
GRANT SELECT ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alerts are public" ON public.alerts FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.environmental_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text NOT NULL REFERENCES public.regions(slug) ON DELETE CASCADE,
  recorded_on date NOT NULL,
  rainfall_mm numeric NOT NULL,
  soil_saturation_pct numeric NOT NULL,
  river_level_m numeric NOT NULL,
  UNIQUE (region_slug, recorded_on)
);
GRANT SELECT ON public.environmental_readings TO anon;
GRANT SELECT ON public.environmental_readings TO authenticated;
GRANT ALL ON public.environmental_readings TO service_role;
ALTER TABLE public.environmental_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readings are public" ON public.environmental_readings FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.disaster_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text NOT NULL REFERENCES public.regions(slug) ON DELETE CASCADE,
  occurred_on date NOT NULL,
  hazard text NOT NULL,
  severity text NOT NULL,
  description text NOT NULL,
  people_affected integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.disaster_events TO anon;
GRANT SELECT ON public.disaster_events TO authenticated;
GRANT ALL ON public.disaster_events TO service_role;
ALTER TABLE public.disaster_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are public" ON public.disaster_events FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text NOT NULL REFERENCES public.regions(slug) ON DELETE CASCADE,
  locality text,
  hazard text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate',
  description text NOT NULL,
  reporter_name text,
  photo_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_reports TO anon;
GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are public" ON public.community_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can submit a report" ON public.community_reports FOR INSERT TO anon, authenticated WITH CHECK (true);

INSERT INTO public.regions (slug, name, capital, population, area_km2, terrain) VALUES
 ('adamawa','Adamawa','Ngaoundere',1200000,63701,'High plateau, savanna'),
 ('centre','Centre','Yaounde',4200000,68953,'Forested hills'),
 ('east','East','Bertoua',830000,109002,'Dense rainforest'),
 ('far-north','Far North','Maroua',4050000,34263,'Sahelian plains, Logone floodplain'),
 ('littoral','Littoral','Douala',3600000,20248,'Coastal lowland, estuary'),
 ('north','North','Garoua',2800000,66090,'Benue river basin'),
 ('northwest','Northwest','Bamenda',2000000,17300,'Volcanic highlands, steep slopes'),
 ('west','West','Bafoussam',1900000,13892,'Volcanic mountains'),
 ('south','South','Ebolowa',750000,47191,'Coastal forest'),
 ('southwest','Southwest','Buea',1600000,25410,'Mount Cameroon slopes, heavy rainfall');

INSERT INTO public.region_risk (region_slug, flood_level, landslide_level, rainfall_mm_7d, soil_saturation_pct, river_level_m, forecast_summary) VALUES
 ('far-north','severe','low',186,92,6.4,'Logone and Mayo Tsanaga levels keep rising after a week of intense storms. Widespread inundation expected in Maroua, Kousseri and Yagoua over the next 72 hours.'),
 ('littoral','high','moderate',142,84,4.1,'Persistent monsoon rain with high tide coincidence. Urban flash flooding likely in low-lying Douala neighbourhoods through the weekend.'),
 ('southwest','high','severe',168,89,3.2,'Saturated volcanic soils on Mount Cameroon slopes. Slope failure risk very high around Buea, Limbe and Idenau after continued rainfall.'),
 ('northwest','moderate','high',121,78,2.6,'Steep highland terrain remains saturated. Localised landslides possible along Bamenda ring road cuttings.'),
 ('west','moderate','high',114,75,2.2,'Heavy afternoon convection over the Bamboutos massif; hillside failures possible on cultivated slopes.'),
 ('north','high','low',132,71,5.2,'Benue river approaching alert stage near Garoua; riverside farmland flooding expected midweek.'),
 ('centre','moderate','moderate',96,66,2.4,'Recurrent evening storms cause drainage overflow in Yaounde valleys; no regional-scale flooding expected.'),
 ('adamawa','low','moderate',68,54,1.8,'Scattered showers only. Plateau escarpment slopes remain the main local concern.'),
 ('east','low','low',74,58,2.1,'Steady forest rainfall with good absorption. Risk remains low across the week.'),
 ('south','moderate','low',103,69,2.9,'Coastal rain bands raise Ntem river levels; minor flooding possible near Campo.');

INSERT INTO public.alerts (region_slug, hazard, severity, title, body, issued_at, expires_at) VALUES
 ('far-north','flood','severe','Severe flood warning - Logone floodplain','River levels have exceeded alert stage at Yagoua. Communities along the Logone should move to higher ground and secure livestock immediately.', now() - interval '2 hours', now() + interval '3 days'),
 ('southwest','landslide','severe','Severe landslide warning - Mount Cameroon slopes','Soil saturation above 88%. Avoid steep slopes and cut banks between Buea and Idenau; several access roads may fail without notice.', now() - interval '5 hours', now() + interval '2 days'),
 ('littoral','flood','high','High flood risk - Douala urban drainage','Blocked drainage combined with 140mm of rain in 7 days. Expect knee-deep water in Bepanda, Ndogpassi and Makepe Missoke.', now() - interval '9 hours', now() + interval '2 days'),
 ('north','flood','high','Benue river rising near Garoua','Riverside farmland and fishing camps should be evacuated over the next 48 hours.', now() - interval '14 hours', now() + interval '4 days'),
 ('northwest','landslide','moderate','Landslide watch - Bamenda ring road','Minor slips already reported. Drivers should avoid night travel on the escarpment sections.', now() - interval '1 day', now() + interval '2 days'),
 ('west','landslide','moderate','Slope watch - Bamboutos massif','Cultivated hillsides above Mbouda are saturated. Report new cracks in the ground to local council.', now() - interval '1 day 6 hours', now() + interval '3 days'),
 ('centre','flood','moderate','Urban flood advisory - Yaounde valleys','Evening storms may overwhelm the Mfoundi drainage. Avoid crossing flooded culverts on foot.', now() - interval '2 days', now() + interval '1 day'),
 ('south','flood','moderate','Ntem river advisory','Slow rise expected near Campo. Fishing communities should monitor updates.', now() - interval '2 days 8 hours', now() + interval '2 days'),
 ('adamawa','landslide','low','Escarpment advisory - Ngaoundere','Low overall risk. Isolated rockfall possible on plateau escarpment roads after showers.', now() - interval '3 days', now() + interval '2 days'),
 ('east','flood','low','Routine monitoring - Bertoua basin','No action required. Conditions reviewed daily.', now() - interval '4 days', now() + interval '3 days');

INSERT INTO public.environmental_readings (region_slug, recorded_on, rainfall_mm, soil_saturation_pct, river_level_m)
SELECT r.slug,
       (date_trunc('month', current_date) - (m || ' month')::interval)::date,
       round((b.base_rain * (1 + 0.55 * sin((11 - m) * 0.62)))::numeric, 1),
       round(least(96, greatest(28, b.base_soil * (1 + 0.28 * sin((11 - m) * 0.62))))::numeric, 1),
       round((b.base_river * (1 + 0.22 * sin((11 - m) * 0.62)))::numeric, 2)
FROM generate_series(0, 11) AS m,
     public.regions r
JOIN LATERAL (
  SELECT CASE r.slug
           WHEN 'far-north' THEN 150 WHEN 'littoral' THEN 240 WHEN 'southwest' THEN 260
           WHEN 'northwest' THEN 145 WHEN 'west' THEN 140 WHEN 'north' THEN 130
           WHEN 'centre' THEN 120 WHEN 'adamawa' THEN 95 WHEN 'east' THEN 110 ELSE 135 END AS base_rain,
         CASE r.slug
           WHEN 'far-north' THEN 78 WHEN 'littoral' THEN 80 WHEN 'southwest' THEN 84
           WHEN 'northwest' THEN 70 WHEN 'west' THEN 68 WHEN 'north' THEN 64
           WHEN 'centre' THEN 62 WHEN 'adamawa' THEN 52 WHEN 'east' THEN 56 ELSE 64 END AS base_soil,
         CASE r.slug
           WHEN 'far-north' THEN 5.2 WHEN 'littoral' THEN 3.6 WHEN 'southwest' THEN 2.9
           WHEN 'northwest' THEN 2.3 WHEN 'west' THEN 2.0 WHEN 'north' THEN 4.4
           WHEN 'centre' THEN 2.2 WHEN 'adamawa' THEN 1.7 WHEN 'east' THEN 1.9 ELSE 2.6 END AS base_river
) b ON true;

INSERT INTO public.disaster_events (region_slug, occurred_on, hazard, severity, description, people_affected) VALUES
 ('far-north','2024-09-12','flood','severe','Logone river overflow inundated Yagoua and surrounding villages.',94000),
 ('far-north','2023-08-28','flood','high','Mayo Tsanaga flash flood damaged bridges around Maroua.',31000),
 ('far-north','2022-10-04','flood','severe','Prolonged floodplain inundation displaced farming households.',120000),
 ('southwest','2024-06-19','landslide','severe','Slope failure on Mount Cameroon flank cut the Limbe-Idenau road.',4200),
 ('southwest','2023-07-08','landslide','high','Debris flow buried homes in a hillside quarter of Limbe.',1800),
 ('littoral','2024-08-02','flood','high','Urban flash flooding across low-lying Douala neighbourhoods.',56000),
 ('littoral','2022-07-21','flood','moderate','Estuary backflow flooded riverside markets.',12000),
 ('northwest','2023-09-16','landslide','high','Escarpment slip closed the Bamenda ring road for six days.',2600),
 ('west','2024-07-27','landslide','moderate','Hillside failure on cultivated slopes near Mbouda.',900),
 ('north','2023-09-02','flood','high','Benue river burst its banks near Garoua, flooding farmland.',22000),
 ('centre','2024-05-30','flood','moderate','Mfoundi drainage overflow in central Yaounde.',7400),
 ('south','2023-10-11','flood','moderate','Ntem river rise flooded fishing camps near Campo.',3100),
 ('adamawa','2022-08-14','landslide','low','Rockfall on plateau escarpment road near Ngaoundere.',150),
 ('east','2023-06-05','flood','low','Localised ponding after heavy forest rainfall in Bertoua.',600);

INSERT INTO public.community_reports (region_slug, locality, hazard, severity, description, reporter_name, status, created_at) VALUES
 ('far-north','Yagoua, Mayo-Danay','flood','severe','Water has entered the market and reached waist height in the eastern quarter. Several families are sheltering at the school.','Aminatou B.','verified', now() - interval '3 hours'),
 ('southwest','Buea, Bokwaongo','landslide','high','A large section of the slope behind the neighbourhood collapsed overnight. Cracks visible above three houses.','Njie E.','verified', now() - interval '7 hours'),
 ('littoral','Douala, Ndogpassi III','flood','moderate','Street drainage blocked, water standing since yesterday evening. Motorbikes cannot pass.','Clarisse M.','reviewing', now() - interval '11 hours'),
 ('northwest','Bamenda, Up Station','landslide','moderate','Small slip on the ring road cutting; loose soil still falling.','Tabi F.','pending', now() - interval '1 day 2 hours'),
 ('north','Garoua, Djamboutou','flood','high','River has covered the lower farms. Livestock moved to higher ground.','Ousmane A.','verified', now() - interval '1 day 9 hours'),
 ('west','Mbouda, Bamesso','landslide','low','New ground cracks appeared in a maize field on the slope.','Pauline K.','pending', now() - interval '2 days'),
 ('centre','Yaounde, Mokolo','flood','moderate','Culvert overflowed during last night storm, shops flooded briefly.','Serge N.','reviewing', now() - interval '2 days 5 hours'),
 ('south','Campo','flood','low','Slight rise of the river near the landing beach, nothing serious yet.','Marie-Jose E.','pending', now() - interval '3 days');