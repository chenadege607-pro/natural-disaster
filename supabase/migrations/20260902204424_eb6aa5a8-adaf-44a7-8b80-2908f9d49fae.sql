-- ============ localities ============
CREATE TABLE public.localities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_slug text NOT NULL REFERENCES public.regions(slug) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'town',
  population integer NOT NULL DEFAULT 0,
  terrain_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.localities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localities TO authenticated;
GRANT ALL ON public.localities TO service_role;
ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.locality_forecasts (
  locality_id uuid NOT NULL PRIMARY KEY REFERENCES public.localities(id) ON DELETE CASCADE,
  flood_level text NOT NULL DEFAULT 'low',
  landslide_level text NOT NULL DEFAULT 'low',
  lead_hazard text NOT NULL DEFAULT 'flood',
  onset_start timestamptz NOT NULL DEFAULT now(),
  onset_end timestamptz NOT NULL DEFAULT now() + interval '12 hours',
  peak_at timestamptz,
  confidence_pct integer NOT NULL DEFAULT 60,
  rainfall_mm_24h numeric NOT NULL DEFAULT 0,
  soil_saturation_pct numeric NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locality_forecasts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locality_forecasts TO authenticated;
GRANT ALL ON public.locality_forecasts TO service_role;
ALTER TABLE public.locality_forecasts ENABLE ROW LEVEL SECURITY;

-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'official', 'citizen');

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text,
  phone text,
  region_slug text REFERENCES public.regions(slug) ON DELETE SET NULL,
  locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_localities_updated BEFORE UPDATE ON public.localities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_forecasts_updated BEFORE UPDATE ON public.locality_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ sms ============
CREATE TABLE public.sms_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  region_slug text REFERENCES public.regions(slug) ON DELETE SET NULL,
  locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  min_severity text NOT NULL DEFAULT 'high',
  frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_subscriptions TO authenticated;
GRANT ALL ON public.sms_subscriptions TO service_role;
ALTER TABLE public.sms_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscriptions" ON public.sms_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.sms_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sms_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  phone text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'alert',
  status text NOT NULL DEFAULT 'queued',
  provider text NOT NULL DEFAULT 'simulated',
  locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sms history" ON public.sms_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ existing tables ============
ALTER TABLE public.alerts
  ADD COLUMN locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  ADD COLUMN expected_onset_at timestamptz,
  ADD COLUMN expected_peak_at timestamptz,
  ADD COLUMN confidence_pct integer NOT NULL DEFAULT 65;

ALTER TABLE public.community_reports
  ADD COLUMN locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
  ADD COLUMN user_id uuid;

CREATE POLICY "Admins manage alerts" ON public.alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Localities public read" ON public.localities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage localities" ON public.localities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Forecasts public read" ON public.locality_forecasts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage forecasts" ON public.locality_forecasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.community_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT UPDATE ON public.community_reports TO authenticated;
GRANT UPDATE, INSERT, DELETE ON public.alerts TO authenticated;

-- ============ seed localities ============
INSERT INTO public.localities (region_slug, slug, name, kind, population, terrain_note) VALUES
('far-north','maroua-domayo','Domayo, Maroua','neighbourhood',48000,'Low-lying quarter beside the Mayo Kaliao channel'),
('far-north','kousseri-madagascar','Madagascar, Kousseri','neighbourhood',36000,'Flat Logone floodplain, poor drainage'),
('far-north','yagoua-centre','Yagoua Centre','town',31000,'Rice plains on the Logone right bank'),
('far-north','mokolo-mandara','Mokolo (Mandara slopes)','town',27000,'Steep granite slopes above the town'),
('north','garoua-poumpoumre','Poumpoumre, Garoua','neighbourhood',42000,'Benue riverbank quarter, sandy soils'),
('north','lagdo-village','Lagdo','town',19000,'Directly downstream of the Lagdo dam spillway'),
('north','pitoa-centre','Pitoa','town',22000,'Seasonal mayo crossings flood fast'),
('north','guider-hills','Guider (hill fringe)','town',24000,'Rocky escarpment with thin topsoil'),
('adamawa','ngaoundere-baladji','Baladji, Ngaoundere','neighbourhood',34000,'Plateau runoff collects in the quarter'),
('adamawa','tibati-lake','Tibati (lakeside)','town',18000,'Lake Mbakaou shoreline settlement'),
('adamawa','banyo-slopes','Banyo (slope quarters)','town',21000,'Volcanic slopes, deep weathered soils'),
('adamawa','meiganga-centre','Meiganga Centre','town',26000,'Gentle plateau, moderate drainage'),
('centre','yaounde-mokolo','Mokolo–Elobi, Yaounde','neighbourhood',57000,'Mfoundi valley bottom, chronic flash flooding'),
('centre','yaounde-nkolbisson','Nkolbisson, Yaounde','neighbourhood',44000,'Built on cut hillsides, cut-slope failures'),
('centre','mbalmayo-centre','Mbalmayo Centre','town',29000,'Nyong river terrace'),
('centre','obala-centre','Obala','town',23000,'Clay soils, slow infiltration'),
('littoral','douala-makepe','Makepe Missoke, Douala','neighbourhood',62000,'Below sea level pockets, tidal backflow'),
('littoral','douala-bonaberi','Bonaberi, Douala','neighbourhood',58000,'Wouri estuary mangrove fringe'),
('littoral','nkongsamba-slopes','Nkongsamba (Manengouba foot)','town',33000,'Steep volcanic footslopes'),
('littoral','edea-centre','Edea Centre','town',27000,'Sanaga river rapids corridor'),
('west','bafoussam-tamdja','Tamdja, Bafoussam','neighbourhood',39000,'Steep cut slopes above the market'),
('west','dschang-foreke','Foreke-Dschang','neighbourhood',26000,'Bamboutos escarpment, landslide scars'),
('west','mbouda-centre','Mbouda Centre','town',24000,'Volcanic ash soils on slopes'),
('west','foumban-centre','Foumban Centre','town',31000,'Plateau, moderate runoff'),
('northwest','bamenda-ntarinkon','Ntarinkon, Bamenda','neighbourhood',41000,'Directly under the Bamenda escarpment'),
('northwest','bamenda-mulang','Mulang, Bamenda','neighbourhood',29000,'Valley floor, Mezam river overflow'),
('northwest','wum-centre','Wum Centre','town',22000,'Crater lake catchment'),
('northwest','ndop-plain','Ndop Plain','town',25000,'Bamendjing reservoir backwater'),
('southwest','limbe-mile4','Mile 4, Limbe','neighbourhood',37000,'Coastal flats at the foot of Mount Cameroon'),
('southwest','buea-bokwango','Bokwango, Buea','neighbourhood',18000,'Volcanic slope with loose scree'),
('southwest','kumba-fiango','Fiango, Kumba','neighbourhood',34000,'Stream-fed basin, blocked culverts'),
('southwest','mundemba-centre','Mundemba','town',14000,'Korup lowland, heavy year rainfall'),
('south','kribi-mboamanga','Mboa Manga, Kribi','neighbourhood',21000,'Beach ridge and lagoon fringe'),
('south','ebolowa-centre','Ebolowa Centre','town',28000,'Rolling hills, laterite soils'),
('south','sangmelima-centre','Sangmelima Centre','town',26000,'Lobo river valley'),
('south','campo-coast','Campo','town',9000,'Ntem estuary, coastal surge exposure'),
('east','bertoua-nkolbikon','Nkolbikon, Bertoua','neighbourhood',30000,'Low quarter behind the main drain'),
('east','batouri-centre','Batouri Centre','town',24000,'Mining pits alter drainage'),
('east','yokadouma-centre','Yokadouma','town',19000,'Dense forest lowland'),
('east','abong-mbang-centre','Abong-Mbang','town',20000,'Nyong headwater swamp edge');

INSERT INTO public.locality_forecasts
  (locality_id, flood_level, landslide_level, lead_hazard, onset_start, onset_end, peak_at, confidence_pct, rainfall_mm_24h, soil_saturation_pct, summary)
SELECT l.id, v.fl, v.ls, v.lead,
       now() + (v.h0 || ' hours')::interval,
       now() + (v.h1 || ' hours')::interval,
       now() + (v.hp || ' hours')::interval,
       v.conf, v.rain, v.soil, v.summary
FROM public.localities l
JOIN (VALUES
('maroua-domayo','severe','low','flood',6,18,11,88,96,94,'Mayo Kaliao expected to overtop its left bank tonight; water 0.8-1.2 m in the lowest streets.'),
('kousseri-madagascar','high','low','flood',18,40,28,74,61,88,'Logone still rising upstream; standing water likely across the quarter by tomorrow evening.'),
('yagoua-centre','high','low','flood',24,48,33,70,54,85,'Rice-plain sheet flooding building over the next two days.'),
('mokolo-mandara','moderate','high','landslide',10,30,20,66,48,79,'Saturated slope debris above the Mandara road; rockfall risk after each storm cell.'),
('garoua-poumpoumre','high','low','flood',12,30,20,77,58,83,'Benue crest arrives overnight; riverbank compounds first affected.'),
('lagdo-village','severe','moderate','flood',4,14,8,84,72,91,'Dam spillway release plus heavy inflow — evacuate the downstream strip now.'),
('pitoa-centre','moderate','low','flood',14,34,24,62,37,71,'Mayo crossings likely impassable for a few hours after each storm.'),
('guider-hills','low','moderate','landslide',26,60,40,55,22,58,'Thin soils on the escarpment may slip locally where cuttings are fresh.'),
('ngaoundere-baladji','moderate','moderate','flood',8,26,16,68,44,76,'Plateau runoff concentrates in Baladji; short-lived knee-deep flooding.'),
('tibati-lake','moderate','low','flood',20,44,30,60,33,72,'Mbakaou lake level up; shoreline plots waterlogged.'),
('banyo-slopes','low','high','landslide',12,36,22,71,41,84,'Deep weathered volcanic soil above the slope quarters is near failure threshold.'),
('meiganga-centre','low','low','flood',30,72,48,52,15,49,'No significant hazard expected; routine rainy-season monitoring.'),
('yaounde-mokolo','severe','moderate','flood',3,9,5,90,84,93,'Flash flooding of the Mfoundi valley expected during this evening storm — 1 m in the lowest lanes.'),
('yaounde-nkolbisson','moderate','severe','landslide',5,20,12,82,78,90,'Cut-slope failure risk very high behind hillside compounds; move away from retaining walls.'),
('mbalmayo-centre','moderate','low','flood',16,38,26,63,39,74,'Nyong terrace overflow likely on the lowest streets.'),
('obala-centre','low','moderate','landslide',22,54,36,56,25,63,'Clay soils slow to drain; minor slumping on road cuttings.'),
('douala-makepe','severe','low','flood',2,12,6,92,101,96,'High tide coincides with the storm peak — Missoke pockets flood within hours.'),
('douala-bonaberi','high','low','flood',6,22,13,80,73,89,'Estuary backflow expected through the mangrove drains overnight.'),
('nkongsamba-slopes','high','severe','landslide',7,24,14,85,88,94,'Manengouba footslopes critically saturated; several slide scars reactivating.'),
('edea-centre','moderate','low','flood',18,42,28,64,46,77,'Sanaga running high; riverside workshops at risk.'),
('bafoussam-tamdja','moderate','severe','landslide',5,18,10,86,79,92,'Steep cuttings above Tamdja market unstable — vacate structures below the slope.'),
('dschang-foreke','high','severe','landslide',8,26,15,83,82,93,'Bamboutos escarpment soils above field capacity; slide reactivation likely.'),
('mbouda-centre','moderate','high','landslide',14,36,24,70,52,81,'Ash soils on slopes losing cohesion after four wet days.'),
('foumban-centre','low','moderate','landslide',28,66,44,54,21,57,'Localised slumping possible on plateau road cuttings.'),
('bamenda-ntarinkon','high','severe','landslide',4,16,9,89,91,95,'Escarpment debris flow risk extreme above Ntarinkon; evacuate the base of the cliff.'),
('bamenda-mulang','severe','low','flood',5,17,10,87,86,92,'Mezam river overflow expected tonight through the valley quarters.'),
('wum-centre','moderate','moderate','flood',20,46,30,61,42,75,'Crater catchment filling; culvert overtopping likely.'),
('ndop-plain','high','low','flood',22,50,34,72,55,86,'Bamendjing backwater spreading across the plain over two days.'),
('limbe-mile4','severe','moderate','flood',3,13,7,91,112,95,'Extreme orographic rainfall plus high tide — Mile 4 flats flood this evening.'),
('buea-bokwango','moderate','severe','landslide',6,20,12,84,94,93,'Loose volcanic scree above Bokwango saturated; debris flow risk high.'),
('kumba-fiango','high','low','flood',9,28,17,78,67,87,'Blocked culverts in Fiango basin will back up within hours of the next cell.'),
('mundemba-centre','moderate','moderate','flood',24,52,36,60,58,80,'Persistent Korup rainfall keeps ground saturated; localised flooding.'),
('kribi-mboamanga','moderate','low','flood',12,32,20,66,49,78,'Lagoon fringe waterlogging with the spring tide.'),
('ebolowa-centre','low','moderate','landslide',26,60,40,55,24,60,'Laterite cuttings may slump after prolonged rain.'),
('sangmelima-centre','moderate','low','flood',18,44,28,58,36,70,'Lobo valley streets prone to short-lived flooding.'),
('campo-coast','moderate','low','flood',14,36,22,64,44,76,'Ntem estuary surge with onshore winds.'),
('bertoua-nkolbikon','high','low','flood',10,30,18,75,63,84,'Main drain already at capacity; Nkolbikon floods first.'),
('batouri-centre','moderate','moderate','flood',22,50,32,57,31,68,'Mining pits divert runoff into inhabited plots.'),
('yokadouma-centre','low','low','flood',30,72,48,50,18,52,'No significant hazard expected in the forecast window.'),
('abong-mbang-centre','moderate','low','flood',20,48,30,59,34,71,'Swamp-edge plots likely waterlogged for several days.')
) AS v(slug, fl, ls, lead, h0, h1, hp, conf, rain, soil, summary) ON v.slug = l.slug;

UPDATE public.alerts a SET
  locality_id = sub.id,
  expected_onset_at = now() + interval '6 hours',
  expected_peak_at = now() + interval '11 hours',
  confidence_pct = 80
FROM (
  SELECT DISTINCT ON (l.region_slug) l.id, l.region_slug
  FROM public.localities l
  JOIN public.locality_forecasts f ON f.locality_id = l.id
  ORDER BY l.region_slug, f.confidence_pct DESC
) sub
WHERE sub.region_slug = a.region_slug;